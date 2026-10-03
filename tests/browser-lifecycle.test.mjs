import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as mainEsm from '../dist/index.mjs';
import * as browserEsm from '../dist/browser/index.mjs';
const require = createRequire(import.meta.url);
const mainCjs = require('../dist/index.js');
const browserCjs = require('../dist/browser/index.js');

// Exercise the packaged browser entry with the media library mocked: no provider
// account, microphone, browser token or paid call is required by these tests.
const cjsSource = readFileSync(new URL('../dist/browser/index.js', import.meta.url), 'utf8');
const esmSource = ts.transpileModule(readFileSync(new URL('../dist/browser/index.mjs', import.meta.url), 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const requestId = '11111111-2222-4333-8444-555555555555';
const sid = 'browser_call_LK11111111222243338444555555555555';
const credentials = {call_sid: sid, room_name: 'room', participant_identity: 'user', participant_token: 'room-only', livekit_url: 'wss://media.invalid'};
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function setup({permission, admission, rejectStart, rejectStop, builder=false, format='cjs', input, authenticated=false, throwErrorCallback} = {}) {
  const events=[], operations=[], requestLog=[];
  input ??= builder?{kind:'builder',request_id:requestId}:{request_id:requestId,assistant_id:42,flow_id:7,recording_consent:true,draft_config:{language:'ur'}};
  const sessionCredentials={...credentials,call_sid:`browser_call_LK${input.request_id.replaceAll('-','').toLowerCase()}`};
  let room, requests=0, readinessTimeout;
  const track={stopped:false, muted:false, stop(){this.stopped=true;},async mute(){this.muted=true;},async unmute(){this.muted=false;}};
  const sdk={
    Room:class {
      constructor(){room=this;this.handlers={};this.remoteParticipants=new Map();this.localParticipant={identity:'user',publishTrack:async()=>operations.push('publish')};}
      on(event,fn){this.handlers[event]=fn;return this;}
      registerTextStreamHandler(_,fn){this.text=fn;}
      async startAudio(){operations.push('playback');}
      async connect(){operations.push('connect');}
      async disconnect(){operations.push('disconnect');}
    },
    createLocalAudioTrack:async()=>{requests++;if(permission)await permission.promise;return track;},
    RoomEvent:{TrackSubscribed:'track',TrackUnsubscribed:'untrack',AudioPlaybackStatusChanged:'playback',ParticipantConnected:'participant',ParticipantAttributesChanged:'attributes',Reconnected:'reconnected',DataReceived:'data',Disconnected:'disconnect'},
    Track:{Kind:{Audio:'audio'}},
  };
  const module={exports:{}};
  vm.runInNewContext(format==='esm'?esmSource:cjsSource, {module,exports:module.exports,require:name=>{if(name==='livekit-client')return sdk;assert.match(name,/session-error\.(js|mjs)$/);return format==='esm'?browserEsm:browserCjs;}, setTimeout:(callback,delay)=>{if(delay===30000)readinessTimeout=callback;return setTimeout(callback,delay);},clearTimeout,AbortController,AbortSignal,TextDecoder,Error,document:{body:{appendChild(){}}},fetch:async(url,options)=>{
    requestLog.push({url,options,body:options.body===undefined?undefined:JSON.parse(options.body)});
    if(url.endsWith('/browser-sessions'))return {ok:true,json:async()=>sessionCredentials};
    return {ok:true,json:async()=>({settled:true})};
  }});
  const transport={
    async start(){operations.push('start');if(admission)await admission.promise;if(rejectStart)throw rejectStart;return builder?{builder_session_id:'builder-1',revision:1,status:'draft',draft:{name:'Example'},final_config:{},voice_cloning_available:false,session:sessionCredentials}:sessionCredentials;},
    async stop(){operations.push('stop');if(rejectStop)throw rejectStop;},
    async status(){operations.push('status');return {settled:true};},
  };
  const callbacks={ready:()=>events.push('ready'),error:(...args)=>{events.push(['error',...args]);if(throwErrorCallback)throw throwErrorCallback;},ended:settled=>events.push(['ended',settled]),transcript:(...args)=>events.push(['transcript',...args]),builderSnapshot:snapshot=>events.push(['builder',snapshot]),playbackBlocked:blocked=>events.push(['blocked',blocked])};
  const call=authenticated
    ?new module.exports.LiveKitBrowserSession('https://api.invalid','account-session-jwt',input,callbacks)
    :module.exports.createBrowserCall({input,transport,callbacks});
  return {call,room,track,events,operations,transport,requestLog,exports:module.exports,get microphoneRequests(){return requests;},get readinessTimeout(){return readinessTimeout;}};
}

test('packaged browser factory shares one start and waits for published microphone plus ready agent', async()=>{
  const admission=deferred(), state=setup({admission});
  const first=state.call.start();assert.equal(state.call.start(),first);await tick();
  const agent={isAgent:true,identity:'agent',attributes:{'lk.agent.state':'listening'}};
  state.room.remoteParticipants.set('agent',agent);state.room.handlers.participant(agent);
  assert.equal(state.events.includes('ready'),false);
  admission.resolve();await first;
  assert.equal(state.microphoneRequests,1);assert.equal(state.operations.filter(x=>x==='start').length,1);
  assert.equal(state.events.filter(x=>x==='ready').length,1);
  await state.call.setMuted(true);assert.equal(state.track.muted,true);await state.call.setMuted(false);assert.equal(state.track.muted,false);
  state.room.handlers.playback(false);await state.call.resumeAudio();assert.deepEqual(state.events.filter(x=>x[0]==='blocked'),[['blocked',true],['blocked',false]]);
  const stopped=state.call.stop();assert.equal(state.call.stop(),stopped);assert.equal(await stopped,true);
  await state.call.start();assert.equal(state.microphoneRequests,1);assert.equal(state.operations.filter(x=>x==='stop').length,1);
});

test('packaged cancellation before permission has no admission and stops the late track',async()=>{
  const permission=deferred(),state=setup({permission});const starting=state.call.start();
  await state.call.stop();permission.resolve();await starting;
  assert.equal(state.operations.includes('start'),false);assert.equal(state.track.stopped,true);
});

test('packaged cancellation during bootstrap still stops only the prebound request',async()=>{
  const admission=deferred(),state=setup({admission});const starting=state.call.start();await tick();
  const stopping=state.call.stop();admission.resolve();await starting;assert.equal(await stopping,true);
  assert.equal(state.operations.includes('connect'),false);assert.deepEqual(state.operations.filter(x=>['start','stop','status'].includes(x)),['start','stop','status']);
});

test('packaged lost acknowledgements require cleanup and failed cleanup remains unsettled',async()=>{
  const state=setup({rejectStart:new Error('lost response'),rejectStop:new Error('cannot confirm')});await state.call.start();
  assert.equal(state.track.stopped,true);assert.equal(await state.call.stop(),false);
  assert.deepEqual(state.events.filter(x=>x[0]==='ended'),[['ended',false]]);assert.equal(state.operations.filter(x=>x==='stop').length,1);
});

test('packaged transcripts preserve segment, speaker, partial and final identity',async()=>{
  const state=setup();await state.call.start();
  const reader={info:{id:'stream',attributes:{'lk.segment_id':'segment','lk.transcription_final':'false'}},withAbortSignal(){return this;},async *[Symbol.asyncIterator](){yield 'Hello';yield ' there';this.info.attributes['lk.transcription_final']='true';}};
  state.room.text(reader,{identity:'user'});await tick();
  assert.deepEqual(state.events.filter(x=>x[0]==='transcript'),[['transcript','user:segment','user','Hello'],['transcript','user:segment','user','Hello there'],['transcript','user:segment','user','Hello there',true]]);
  await state.call.stop();const before=state.events.length;state.room.text(reader,{identity:'user'});await tick();assert.equal(state.events.length,before);
});

test('packaged builder transport uses native nested session and emits authoritative draft',async()=>{
  const state=setup({builder:true});await state.call.start();
  const snapshot=state.events.find(x=>x[0]==='builder')[1];assert.equal(snapshot.builder_session_id,'builder-1');assert.equal(snapshot.session,undefined);
  await state.call.stop();
});


for (const [format, main, browser] of [['cjs',mainCjs,browserCjs],['esm',mainEsm,browserEsm]]) {
  test(`${format} browser and API entries share error identity and classify rejected admission`,async()=>{
    assert.equal(main.SessionRequestError,browser.SessionRequestError);
    const failure=new main.SessionRequestError('Configuration rejected',422);
    const state=setup({rejectStart:failure,format});await state.call.start();
    const error=state.events.find(x=>x[0]==='error');
    assert.equal(error[2].reason,'configuration_rejected');assert.equal(error[2].http_status,422);
    // Request-bound transports stop even known rejections: a proxy can rewrite
    // the response after an admission succeeded upstream.
    assert.equal(state.operations.filter(x=>x==='stop').length,1);
    assert.deepEqual(state.events.filter(x=>x[0]==='ended'),[['ended',true]]);
  });
}


for (const format of ['cjs','esm']) {
  test(`${format} constructed input snapshot keeps admission and cleanup on one identity despite caller edits`,async()=>{
    const permission=deferred();
    const input={request_id:requestId,assistant_id:42,recording_consent:true,draft_config:{llm_settings:{system_prompt:'Original'}},variables:{firstName:'Meeran'}};
    const state=setup({input,permission,authenticated:true,format});
    input.request_id='aaaaaaaa-2222-4333-8444-555555555555';
    input.assistant_id=99;input.recording_consent=false;
    input.draft_config.llm_settings.system_prompt='Replaced';input.variables.firstName='Replaced';
    const starting=state.call.start();
    input.request_id='bbbbbbbb-2222-4333-8444-555555555555';
    permission.resolve();await starting;await state.call.stop();
    const body=state.requestLog[0].body;
    assert.equal(body.request_id,requestId);assert.equal(body.assistant_id,42);assert.equal(body.recording_consent,true);
    assert.equal(body.draft_config.llm_settings.system_prompt,'Original');assert.equal(body.variables.firstName,'Meeran');
    assert.ok(state.requestLog.some(request=>request.url.endsWith(`/${sid}/stop`)));
    assert.equal(state.events.some(event=>event[0]==='error'),false);
  });

  test(`${format} uppercase UUID matches canonical backend SID for admission and shutdown`,async()=>{
    const input={request_id:'ABCDEF12-2222-4333-8444-555555555555',assistant_id:42};
    const state=setup({input,authenticated:true,format});await state.call.start();await state.call.stop();
    assert.equal(state.events.some(event=>event[0]==='error'),false);
    assert.ok(state.requestLog.some(request=>request.url.endsWith('/browser_call_LKabcdef12222243338444555555555555/stop')));
  });

  test(`${format} throwing consumer error callback still stops microphone and admitted request`,async()=>{
    const callbackFailure=new Error('Consumer callback failed');
    const state=setup({rejectStart:new Error('Lost acknowledgement'),throwErrorCallback:callbackFailure,format});
    await assert.rejects(state.call.start(),error=>error===callbackFailure);
    assert.equal(state.track.stopped,true);assert.equal(state.operations.filter(operation=>operation==='stop').length,1);
    assert.deepEqual(state.events.filter(event=>event[0]==='ended'),[['ended',true]]);
  });
}


for (const event of ['disconnect','timeout']) {
  test(`throwing consumer callback during ${event} still confirms cleanup`,async()=>{
    const callbackFailure=new Error('Consumer callback failed');
    const state=setup({throwErrorCallback:callbackFailure});await state.call.start();
    assert.throws(()=>event==='disconnect'?state.room.handlers.disconnect():state.readinessTimeout(),error=>error===callbackFailure);
    assert.equal(await state.call.stop(),true);assert.equal(state.track.stopped,true);
    assert.equal(state.operations.filter(operation=>operation==='stop').length,1);
  });
}
