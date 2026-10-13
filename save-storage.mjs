export const FORMAT='MT_SIM_SAVE', VERSION='1.0.0', ENGINE='MT_SIM_R02_1';
export const BASELINE='347007A13D1E35D434AFAC18083E6527FEF1A0B680F27AAD83905B48A243DF47';
export const SLOTS=['A','B','C','AUTO'];
export function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
export async function digest(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(v))))].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
const fail=()=>{throw Error('SAVE_INVALID');};
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
const ids=['player','lin','officer'];
const objects=['SET-01','SET-02','SET-03','SET-04','SET-05','SET-06','WATER-CUP'];
const fields=(v,keys)=>{if(!record(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))fail();};
const allowed=(v,keys)=>{if(!record(v)||Object.keys(v).some(k=>!keys.includes(k)))fail();};
const unique=(rows,key='id')=>{if(!Array.isArray(rows)||rows.length>10000||rows.some(x=>!record(x)||typeof x[key]!=='string'||!x[key]||x[key].length>160)||new Set(rows.map(x=>x[key])).size!==rows.length)fail();};
function safeTree(v,depth=0){if(depth>35)fail();if(typeof v==='string'&&v.length>20000)fail();if(typeof v==='number'&&!Number.isFinite(v))fail();if(Array.isArray(v)&&v.length>10000)fail();if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor','token','api_key','credential','provider_budget','pid','runtime_epoch'].includes(k))fail();safeTree(x,depth+1);}}}
export function validatePayload(p){
 fields(p,['campaign','timeline','scene','actors','objects','events','transfers','commit_keys','requests','contents']);safeTree(p);
 fields(p.campaign,['campaign_id','baseline_id','baseline_digest','creation_id']);
 if(p.campaign.baseline_digest!==BASELINE||p.campaign.baseline_id!=='R04+SIM_WATER_PROPOSED_R01'||!p.campaign.campaign_id||!p.campaign.creation_id)fail();
 fields(p.timeline,['timeline_id','parent_save_id','ancestors','chapter_id','world_version','next_event_sequence']);
 if(!['CH01_RECRUITMENT_HALL','CH02_WAITING_AREA'].includes(p.timeline.chapter_id)||!Number.isSafeInteger(p.timeline.world_version)||p.timeline.world_version<0||p.timeline.next_event_sequence!==p.events.length+1||!Array.isArray(p.timeline.ancestors)||p.timeline.ancestors.length>1000)fail();
 fields(p.scene,['group','scene','scene_instance_id','acknowledged','initial_actors','variant']);
 if(!['baseline','experiment','water'].includes(p.scene.group)||!['SCENE-01','SCENE-02','SCENE-03'].includes(p.scene.scene)||typeof p.scene.acknowledged!=='boolean'||!['witness','occluded','absent'].includes(p.scene.variant))fail();
 fields(p.actors,ids);unique(p.events);unique(p.objects);unique(p.contents);unique(p.requests);
 if(p.events.length+p.contents.length+p.requests.length>10000||p.objects.some(o=>!objects.includes(o.id)||!['water','tag','paper','chair',null].includes(o.object)||![...ids,null].includes(o.owner)||!Number.isFinite(o.x)||!Number.isFinite(o.y)))fail();
 const eventMap=new Map(p.events.map(e=>[e.id,e])), timelines=new Set([p.timeline.timeline_id,...p.timeline.ancestors]);
 let last=0;for(let i=0;i<p.events.length;i++){
  const e=p.events[i];allowed(e,['campaign_id','timeline_id','chapter_id','scene_instance_id','source_version','id','sequence','type','actor_id','world_version','object_id','text','description','range','evidence','session_id','request_id','revision','action','provider_output_ref','semantic','emotion_proposal','based_on_observation_ids']);if(e.sequence!==i+1||e.campaign_id!==p.campaign.campaign_id||!timelines.has(e.timeline_id)||!ids.concat('scene').includes(e.actor_id)||!Number.isSafeInteger(e.world_version)||e.world_version<last||e.world_version>p.timeline.world_version||!Array.isArray(e.range?.ids)||new Set(e.range.ids).size!==e.range.ids.length||e.range.ids.some(id=>!ids.includes(id))||!['CH01_RECRUITMENT_HALL','CH02_WAITING_AREA'].includes(e.chapter_id)||!['SIMULATION_OBJECT_PRESENTED','SIMULATION_TEXT_PRESENTED','SIMULATION_ACTOR_TEXT_DELIVERY','SIMULATION_ACTION_COMPLETED'].includes(e.type)||!['BROWSER_INITIAL_SCENE_ACK_SIMULATION_ONLY','BROWSER_PRESENTATION_ACK_SIMULATION_ONLY','HOST_ACTOR_CONTEXT_DELIVERY_SIMULATION_ONLY'].includes(e.evidence))fail();last=e.world_version;
  if(e.action){const a=e.action;const actionKeys={walk:['type','x','y'],turn:['type','target'],handover:['type','target','object'],sit:['type','object'],leave:['type'],wait:['type'],refuse:['type']};if(!actionKeys[a.type])fail();allowed(a,actionKeys[a.type]);if(a.type==='walk'&&(!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<40||a.x>760||a.y<80||a.y>400))fail();if(a.type==='handover'&&(!ids.includes(a.target)||!['water','tag','paper'].includes(a.object)))fail();}
 }
 let total=p.events.length+p.contents.length+p.requests.length;
 for(const id of ids){
  const a=p.actors[id];fields(a,['id','x','y','facing','left','seated','version','emotion','gesture','observations','memory','persona_version','beliefs','intents','relationships','unresolved','projection_cursor']);
  if(a.id!==id||a.persona_version!=='R04'||!Number.isFinite(a.x)||!Number.isFinite(a.y)||typeof a.left!=='boolean'||typeof a.seated!=='boolean'||!Number.isSafeInteger(a.version)||a.version<0||a.projection_cursor>p.events.length)fail();
  unique(a.observations);unique(a.memory);total+=a.observations.length+a.memory.length;const observations=new Map(a.observations.map(o=>[o.id,o]));
  for(const o of a.observations){allowed(o,['id','type','actor_id','source_event_id','sequence','campaign_id','timeline_id','speaker','text','action','description','object_id','knowledge_kind','range_version']);const e=eventMap.get(o.source_event_id);if(!e||!e.range.ids.includes(id)||o.actor_id!==id||o.sequence!==e.sequence||o.campaign_id!==p.campaign.campaign_id||o.timeline_id!==e.timeline_id||o.knowledge_kind!==(e.text?(id===e.actor_id?'SELF_REPORTED':'HEARD_CLAIM'):'EXPERIENCED')||o.text!==(e.text??'')||stable(o.action??null)!==stable(e.action??null)||o.description!==(e.description??''))fail();}
  for(const m of a.memory){allowed(m,['id','actor_id','kind','text','observation_id','source_event_id','campaign_id','timeline_id','sequence','externally_verified','proposal_state']);const o=observations.get(m.observation_id);if(!o||m.source_event_id!==o.source_event_id||m.actor_id!==id||m.campaign_id!==p.campaign.campaign_id||m.timeline_id!==o.timeline_id||m.sequence!==o.sequence)fail();if(m.proposal_state==='PROPOSED_NOT_FACT'){if(!['BELIEVES','INTENDS'].includes(m.kind))fail();}else if(m.kind!==o.knowledge_kind||m.text!==(o.text||o.description||''))fail();}
  if(a.beliefs.length||a.intents.length||a.relationships.length||a.unresolved.length)fail(); // no uncontracted authoritative caches
 }
 if(total>10000)fail();
 for(const e of p.events)for(const id of e.range.ids)if(!p.actors[id].observations.some(o=>o.source_event_id===e.id))fail();
 for(const e of p.events)for(const id of e.based_on_observation_ids??[])if(!p.actors[e.actor_id]?.observations.some(o=>o.id===id&&o.sequence<e.sequence))fail();
 if(!Array.isArray(p.commit_keys)||p.commit_keys.length>10000||p.commit_keys.some(k=>!Array.isArray(k)||k.length!==2||typeof k[0]!=='string'||typeof k[1]!=='string')||new Set(p.commit_keys.map(k=>k[0])).size!==p.commit_keys.length)fail();
 for(const r of p.requests)if(!['COMPLETE','UNAVAILABLE','CLARIFY','CANCELLED','PARTIAL','UNKNOWN','STALE'].includes(r.state)||typeof r.fingerprint!=='string')fail();
 for(const e of p.events)if(e.request_id&&(!p.requests.some(r=>r.id===e.request_id)||!p.commit_keys.some(k=>k[0].startsWith(e.request_id+':'))))fail();
 for(const c of p.contents){const e=eventMap.get(c.source_event_id);if(!e||c.text!==e.text||c.content_hash===undefined)fail();}
 for(const t of p.transfers)if(!p.events.some(e=>e.type==='SIMULATION_ACTION_COMPLETED'&&e.actor_id===t.actor&&e.world_version===t.version&&stable(e.action)===stable({type:'handover',target:t.target,object:t.object})))fail();
 return p;
}
export async function makeSave(payload){validatePayload(payload);const id=crypto.randomUUID();return {format:FORMAT,schema_version:VERSION,save_id:id,campaign_id:payload.campaign.campaign_id,timeline_id:payload.timeline.timeline_id,created_at:new Date().toISOString(),chapter_id:payload.timeline.chapter_id,event_cursor:payload.events.length,baseline_digest:BASELINE,content_version:'SIM_WATER_R01',engine_compatibility:ENGINE,payload:structuredClone(payload),payload_sha256:await digest(payload)};}
export async function validateSave(s){
 if(new TextEncoder().encode(JSON.stringify(s)).length>5*1024*1024)throw Error('SAVE_TOO_LARGE');
 fields(s,['format','schema_version','save_id','campaign_id','timeline_id','created_at','chapter_id','event_cursor','baseline_digest','content_version','engine_compatibility','payload','payload_sha256']);
 if(s.format!==FORMAT||s.schema_version!==VERSION||s.engine_compatibility!==ENGINE||s.baseline_digest!==BASELINE||s.content_version!=='SIM_WATER_R01')throw Error('SAVE_INCOMPATIBLE');
 validatePayload(s.payload);if(s.campaign_id!==s.payload.campaign.campaign_id||s.timeline_id!==s.payload.timeline.timeline_id||s.chapter_id!==s.payload.timeline.chapter_id||s.event_cursor!==s.payload.events.length||s.payload_sha256!==await digest(s.payload)||typeof s.save_id!=='string'||!Number.isFinite(Date.parse(s.created_at)))fail();for(const c of s.payload.contents){const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(c.text)))].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();if(c.content_hash!==h)fail();}return structuredClone(s);
}
export function database(name='mt-story-simulator-r02'){
 const db=new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('slots',{keyPath:'slot'});r.result.createObjectStore('meta',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 async function tx(mode,work){const d=await db;return new Promise((resolve,reject)=>{const t=d.transaction(['slots','meta'],mode);let result;try{result=work(t);}catch(e){t.abort();reject(e);return;}t.oncomplete=()=>resolve(result);t.onabort=()=>reject(t.error??Error('STORAGE_TRANSACTION_FAILED'));t.onerror=()=>{};});}
 return {
  async list(){const d=await db;return new Promise((resolve,reject)=>{const r=d.transaction('slots').objectStore('slots').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});},
  async write(slot,save,{abort=false}={}){if(!SLOTS.includes(slot))throw Error('SLOT_INVALID');await validateSave(save);return tx('readwrite',t=>{t.objectStore('slots').put({slot,save});t.objectStore('meta').put({key:'selected',slot,campaign_id:save.campaign_id});if(abort)t.abort();});},
  remove(slot){if(!SLOTS.includes(slot))throw Error('SLOT_INVALID');return tx('readwrite',t=>{t.objectStore('slots').delete(slot);t.objectStore('meta').delete('selected');});},
  clearCampaign(campaign_id){return tx('readwrite',t=>{const r=t.objectStore('slots').openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(c.value.save.campaign_id===campaign_id)c.delete();c.continue();}};const q=t.objectStore('meta').get('selected');q.onsuccess=()=>{if(q.result?.campaign_id===campaign_id)t.objectStore('meta').delete('selected');};});},
  async close(){(await db).close();}
 };
}
