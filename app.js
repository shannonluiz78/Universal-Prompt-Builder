import {MODES,TASKS,FIELD_OPTIONS,EMPTY,EXAMPLES,suggestMode,suggestTask,suggestDefaults,diagnose,autoRepair,buildPrompt,optimize,briefing} from './engine.mjs';
import {availableApps,getApp,getTargetModel,recommendedTargetApp,recommendedTargetModel,CATALOG_UPDATED} from './catalog.mjs';
const $=id=>document.getElementById(id);
const q=(selector)=>document.querySelector(selector);
const qa=(selector)=>[...document.querySelectorAll(selector)];
const safe=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='prompt_builder_draft_v11',LIB='prompt_builder_library_v11';
function readStore(key, fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function validState(a){return a&&typeof a==='object'&&MODES.includes(a.mode)}
let state=validState(readStore(STORAGE,null))?{...EMPTY,...readStore(STORAGE,null)}:{...EMPTY};
state.imageName=''; // Metadata is not proof of a live uploaded asset after a page reload.
let library=readStore(LIB,[]);if(!Array.isArray(library))library=[];
// Non-destructive, one-time migration of compatible PromptCraft V1 local entries.
if(!library.length){
 const old=readStore('pc_library_v1',[]);
 if(Array.isArray(old)&&old.length){
  const taskMap={research:'Research',writing:'Writing',marketing:'Marketing',analysis:'Analysis',coding:'Coding',agent:'AI Agent'};
  library=old.filter(e=>e&&e.payload&&e.payload.fields).map(e=>{
   const p=e.payload,f=p.fields,m=p.mode==='image'||p.mode==='video'?p.mode:'text';
   return {id:crypto.randomUUID?.()||'migrated-'+Math.random().toString(36).slice(2),title:e.title||f.title||'Imported prompt',mode:m,created:e.created_at||new Date().toISOString(),data:{...EMPTY,mode:m,task:taskMap[p.mode]||'Research',goal:m==='text'?(f.goal||''):(f.subject||''),rootProblem:'',audience:f.audience||'',facts:f.context||'',constraints:f.constraints||'',success:f.success||'',format:f.outputFormat||'AI recommends',tone:f.tone||'AI recommends',purpose:f.purpose||'AI recommends',style:f.style||'AI recommends',composition:f.composition||'AI recommends',lighting:f.lighting||'AI recommends',ratio:f.aspectRatio||'AI recommends',motion:f.action||'AI recommends',camera:f.camera||'AI recommends',duration:f.duration||'AI recommends',audio:f.audio||'AI recommends',exclusions:f.exclude||'',referenceNotes:f.reference||'',overlay:f.textOverlay||'',imageName:''}};
  });
  try{localStorage.setItem(LIB,JSON.stringify(library))}catch{}
 }
}
let page='builder',step=1,feature='detective',advanced=false,referenceUrl=null,lastAiOutput='',language='en',vaultClient=null,vaultUser=null,lastAiOperation='',originalAiPrompt='';
const customEditing=new Set();
const labels={
 en:{templates:'Templates',builder:'Create prompt',library:'My library',guide:'Quick guide',settings:'AI Settings',workspace:'WORKSPACE',account:'ACCOUNT'},
 zh:{templates:'模板',builder:'创建提示词',library:'我的收藏',guide:'简易指南',settings:'AI 设置',workspace:'工作台',account:'账户'}
};
const fieldData={
 text:[['audience','Who is this for?','Choose who will read or use the result.'],['format','How should the answer look?','Choose a format that is easy to use.'],['tone','What tone should it use?','Keep it simple and readable.'],['success','What would make this successful?','Example: actionable steps, accurate figures, clear tests.','textarea'],['language','Output language','Choose English or Chinese.']],
 image:[['purpose','Where will you use the image?','This helps the AI pick a useful layout.'],['style','Which visual style do you prefer?','Unsure? Let AI recommend.'],['composition','How should the scene be framed?','Camera angle and subject placement.'],['lighting','What kind of lighting?','Select the mood of the scene.'],['ratio','What image shape do you want?','Vertical, square, or landscape.'],['language','Output language','Choose English or Chinese.']],
 video:[['purpose','Where will you use the video?','TikTok, advertisement, presentation, etc.'],['style','How should the video look?','Pick one visual direction.'],['motion','What should move?','The person, object, or environment.'],['camera','How should the camera move?','Choose one movement for a short clip.'],['duration','How long is the video?','Longer clips may need several shots.'],['ratio','What shape should it be?','Choose vertical or landscape.'],['language','Output language','Choose English or Chinese.']],
 image2video:[['purpose','Where will you use the clip?','Select its intended platform.'],['motion','What should move in the photo?','Keep motion gentle to preserve details.'],['camera','How should the camera move?','One smooth movement works best.'],['duration','How long is the animation?','Start with a short clip.'],['ratio','What shape should it be?','Match the original photo when possible.'],['referenceNotes','What must stay unchanged?','Example: same person, face, furniture and layout.','textarea'],['language','Output language','Choose English or Chinese.']]
};
const advancedFields={
 text:[['facts','Background / known facts','Include only real facts or documents.','textarea'],['constraints','Rules and things to avoid','Example: do not invent details or make unsupported claims.','textarea']],
 image:[['exclusions','Things to avoid','Example: distorted hands, fake logos, warped walls.','textarea'],['overlay','Words that must appear','Exact text; image text may need manual checking.','input']],
 video:[['audio','Sound or music','Only if your video generator supports sound.','input'],['overlay','Words on screen','Add exact wording if needed.','input'],['exclusions','Avoid in the clip','Example: flicker, morphing or watermarks.','textarea']],
 image2video:[['audio','Sound or ambience','Depends on the destination model.','input'],['overlay','Words on screen','Optional; check tool support.','input'],['exclusions','Things to avoid','Example: morphing faces or new objects.','textarea']]
};
const guidance={
 en:{main:'What would you like to achieve?',problem:'What problem are you really trying to solve?',reference:'Reference photo'},
 zh:{main:'你想实现什么目标？',problem:'你真正要解决的问题是什么？',reference:'参考照片'}
};
function saveDraft(){try{let data={...state,imageName:''};localStorage.setItem(STORAGE,JSON.stringify(data))}catch{toast('Storage is full or blocked. Export your prompts.') }}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function setPage(next){page=next;qa('.page').forEach(el=>el.classList.toggle('active',el.id===`page-${next}`));qa('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===next));$('breadcrumb').textContent=labels[language]?.[next]||next;qa('.sidebar .nav').forEach(x=>x.classList.toggle('active',x.dataset.nav===next));$('sidebar').classList.remove('open');$('overlay').classList.remove('open');$('overlay').hidden=true;if(next==='library')renderLibrary();if(next==='templates')renderTemplates();window.scrollTo({top:0,behavior:'smooth'})}
function updateMode(){renderTargets();qa('[data-mode]').forEach(x=>x.classList.toggle('chosen',x.dataset.mode===state.mode));$('textCategory').hidden=state.mode!=='text';$('rootLabel').textContent=state.mode==='text'?guidance[language].problem:'Why are you creating this? (optional)';$('refUpload').hidden=state.mode!=='image2video';$('goal').placeholder={text:'Example: Build a simple CRM for a small real estate business.',image:'Example: A sunlit modern living room with floor-to-ceiling windows.',video:'Example: A cinematic 8-second clip revealing a new product.',image2video:'Example: Animate this photo into a slow cinematic property tour.'}[state.mode];renderGuided();refresh()}
function setState(patch,rerender=false){Object.assign(state,patch);state.optimizedPrompt='';saveDraft();if(rerender)updateMode();else refresh()}
function renderTask(){ $('task').innerHTML=TASKS.map(t=>`<option ${state.task===t?'selected':''}>${safe(t)}</option>`).join('') }
function fieldHtml(def){const [key,label,help,type]=def;
 const list=FIELD_OPTIONS[state.mode]?.[key];let input='';
 if(list){const isCustom=customEditing.has(key)|| (!!state[key]&&!list.includes(state[key]));const value=isCustom?'__other__':(list.includes(state[key])?state[key]:list[0]);input=`<select data-choice="${key}" aria-label="${safe(label)}">${list.map(s=>`<option ${s===value?'selected':''} value="${safe(s)}">${safe(s)}</option>`).join('')}<option value="__other__" ${isCustom?'selected':''}>Other — type my own...</option></select>${isCustom?`<input data-custom="${key}" class="custom-answer" aria-label="Custom ${safe(label)}" placeholder="Type your own answer" value="${safe(state[key]||'')}">`:''}`;}
 else if(type==='textarea')input=`<textarea data-value="${key}" rows="2" placeholder="Type your answer (optional)">${safe(state[key]||'')}</textarea>`;
 else input=`<input data-value="${key}" value="${safe(state[key]||'')}" placeholder="Type your answer (optional)">`;
 return `<div class="guided-item"><label for="field-${key}">${safe(label)}</label><p>${safe(help)}</p>${input}</div>`;
}
function renderGuided(){ $('guidedFields').innerHTML=fieldData[state.mode].map(fieldHtml).join('');$('advancedFields').innerHTML=advancedFields[state.mode].map(fieldHtml).join('');$('advancedFields').hidden=!advanced;$('advancedBtn').textContent=advanced?'− Hide extra options':'＋ More options (optional)';$('advancedBtn').setAttribute('aria-expanded',String(advanced)); }
function renderStep(){for(let i=1;i<=3;i++)$(`step${i}`).hidden=i!==step;qa('[data-step]').forEach(b=>b.classList.toggle('active',Number(b.dataset.step)===step));$('stepCount').textContent=`Step ${step} of 3`;$('backBtn').disabled=step===1;$('nextBtn').textContent=step===3?'Finish ✓':'Continue →';if(step===3)renderReview()}
function iconForIssue(severity){return severity==='critical'?'● Critical':severity==='warning'?'◐ Review':'○ Tip'}
function renderReview(){const d=diagnose(state);$('reviewList').innerHTML=d.issues.length?d.issues.map(i=>`<div class="review-item ${i.severity}"><strong>${iconForIssue(i.severity)}</strong><span>${safe(i.label)} — ${safe(i.advice)}</span></div>`).join(''):'<div class="review-item">✓ No structural gaps detected. Review facts and model capabilities manually.</div>'}
function renderFeature(){const d=diagnose(state),m=optimize(state),b=briefing(state);let html='';
 if(feature==='detective'){
  html=`<h3>🧠 What is the real challenge?</h3><div class="feature-row"><b>Goal</b><p>${safe(b.objective||'Tell us your main idea to begin.')}</p></div><div class="feature-row"><b>Underlying problem</b><p>${safe(b.rootProblem)}</p></div>`;
  if(b.keyQuestions.length)html+=`<div class="feature-row"><b>Questions to resolve</b><ul>${b.keyQuestions.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></div>`;
  if(!d.critical)html+='<p>✓ No critical blockers detected by the checklist.</p>';
 }else if(feature==='tokens'){
  html=`<h3>⚡ Trim unnecessary instructions</h3><div class="feature-row"><b>Detailed draft: ~${m.baselineTokens} tokens</b><p>Efficient variant: ~${m.efficientTokens} tokens</p></div><div class="feature-row"><b>Estimated difference: ${m.reduction}%</b><p>Measured between the two prompt formats — not guaranteed API savings. Neither figure includes the model response.</p></div><p>${safe(m.note)}</p>`;
 }else{
  html=`<h3>${d.ready?'✓ No critical blockers':'◉ Review before using AI'}</h3><p>${safe(d.summary)}</p>`;
  html+=d.issues.length?`<ul>${d.issues.slice(0,5).map(i=>`<li><b>${safe(i.label)}:</b> ${safe(i.advice)}</li>`).join('')}</ul>`:'<p>Check the model’s actual output before using it.</p>';
 }
 $('featureContent').innerHTML=html;
}
function finalPrompt(){return state.optimizedPrompt || buildPrompt(state)}
function refresh(){const d=diagnose(state),m=optimize(state),prompt=finalPrompt();$('promptOutput').textContent=prompt||'Describe your idea to see a ready-to-use prompt.';$('charCount').textContent=`${prompt.length} characters · ~${Math.ceil(prompt.length/4)} tokens (estimate)`;$('readyStatus').textContent=!state.goal.trim()?'Add an idea':d.critical?'Review gaps':'Draft ready';$('readyStatus').classList.toggle('ok',!!state.goal.trim()&&!d.critical);renderFeature();if(step===3)renderReview()}
function handleFieldChange(e){const t=e.target,k=t.dataset.value||t.dataset.choice||t.dataset.custom;if(!k)return;
 if(t.dataset.choice){if(t.value==='__other__'){customEditing.add(k);state[k]='';renderGuided();setTimeout(()=>q(`[data-custom="${k}"]`)?.focus(),0)}else{customEditing.delete(k);state[k]=t.value;renderGuided()}}
 else state[k]=t.value;
 state.optimizedPrompt='';saveDraft();refresh();
}
function smartStart(){if(!state.goal.trim()){toast('Describe an idea first.');$('goal').focus();return}
 const mode=suggestMode(state.goal),task=suggestTask(state.goal);state.mode=mode;state.targetApp=recommendedTargetApp(mode);state.targetModel=recommendedTargetModel(mode,state.targetApp);state.optimizedPrompt='';state.task=task;renderTask();updateMode();toast(`Smart Start: ${mode==='image2video'?'Image to Video':mode.charAt(0).toUpperCase()+mode.slice(1)}${mode==='text'?' · '+task:''} selected.`)}
function smartFill(){state=suggestDefaults(state);state.optimizedPrompt='';renderGuided();saveDraft();refresh();toast('Recommended options added. Adjust any answer.')}
function applyFix(){const before=JSON.stringify(state);state=autoRepair(state);state.optimizedPrompt='';renderGuided();saveDraft();refresh();toast(before===JSON.stringify(state)?'No safe defaults remaining. Please answer unresolved questions.':'Applied safe defaults. Please check the results.')}
function copyText(text){if(!text)return toast('Create a prompt first.');navigator.clipboard?.writeText(text).then(()=>toast('Copied to clipboard')).catch(()=>{toast('Clipboard blocked. Please select and copy the preview.')})}
function download(text,filename,mime='text/plain;charset=utf-8'){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function storeLibrary(){try{localStorage.setItem(LIB,JSON.stringify(library))}catch{toast('Library storage unavailable. Export JSON instead.')}}
function saveToLibrary(){if(!state.goal.trim())return toast('Enter a main idea first.');const title=state.goal.trim().slice(0,64),entry={id:crypto.randomUUID?.()||`p-${Date.now()}`,title,mode:state.mode,created:new Date().toISOString(),data:{...state,imageName:''}};library.unshift(entry);storeLibrary();$('libraryCount').textContent=library.length;toast('Saved to your local library.')}
function renderLibrary(){const query=$('librarySearch').value.toLowerCase().trim(),items=library.filter(x=>[x.title,x.mode].join(' ').toLowerCase().includes(query));$('libraryCount').textContent=library.length;$('libraryItems').innerHTML=items.length?items.map(e=>`<article class="panel library-card"><small>${safe(e.mode.toUpperCase())} · ${safe((e.created||'').slice(0,10))}</small><h3>${safe(e.title||'Untitled prompt')}</h3><p>${safe((e.data?.goal)||'')}</p><div class="card-actions"><button class="btn btn-mist" data-open="${safe(e.id)}">Open</button><button class="btn btn-light" data-delete="${safe(e.id)}">Delete</button></div></article>`).join(''):'<div class="empty-library">✧<br>No saved prompts yet. Create and save one to see it here.</div>'}
function renderTemplates(){
 $('templateItems').innerHTML=EXAMPLES.map((e,i)=>`<article class="panel library-card"><small>${safe(e.mode.toUpperCase())} · STARTER ${String(i+1).padStart(2,'0')}</small><h3>${safe(e.title)}</h3><p>${safe(e.goal)}</p><div class="card-actions"><button class="btn btn-mist" data-template="${i}">Use template →</button></div></article>`).join('');
}
function importLibrary(file){if(!file||file.size>1500000)return toast('Choose a JSON file under 1.5 MB.');file.text().then(v=>{try{const imported=JSON.parse(v);const items=Array.isArray(imported)?imported:imported.prompts;if(!Array.isArray(items))throw Error('Unsupported library format');const clean=items.filter(x=>x&&validState(x.data)&&typeof x.title==='string').slice(0,200).map(x=>({...x,id:crypto.randomUUID?.()||`p-${Date.now()}-${Math.random()}`,data:{...EMPTY,...x.data,imageName:''}}));library=[...clean,...library];storeLibrary();renderLibrary();toast(`Imported ${clean.length} prompts.`)}catch{toast('Invalid Prompt Builder JSON file.')}})}
function approxTokens(text){return Math.ceil((text||'').length/4)}
async function authHeader(){if(!vaultClient||!vaultUser)return {};const{data}=await vaultClient.auth.getSession();return data?.session?.access_token?{'Authorization':'Bearer '+data.session.access_token}:{};}
async function apiFetch(path,payload){const headers={'Content-Type':'application/json',...(await authHeader())};const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);try{const res=await fetch(path,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});const json=await res.json();if(!res.ok)throw Error(json.error||`HTTP ${res.status}`);return json;}finally{clearTimeout(timer)}}
async function aiCall(operation){const base=finalPrompt();if(!base)return toast('Create a prompt first.');
 let prompt=base;
 if(operation==='troubleshoot'){const failed=promptForTroubleshoot();if(!failed)return;prompt=`ORIGINAL PROMPT:\n${base}\n\nFAILED OUTPUT OR ERROR:\n${failed}`;}
 setPage('builder');originalAiPrompt=base;lastAiOperation=operation;
 $('beforeAfter').hidden=true;$('applyResult').hidden=true;
 showModal(operation==='test'?'AI test output':operation==='troubleshoot'?'Prompt Troubleshooter':'AI-optimized prompt', 'Sending a request to your selected Gemini test model…','Please wait…');
 try{const data=await apiFetch('/api/ai',{operation,model:$('model').value,apiKey:$('apiKey').value.trim(),accessCode:$('accessCode').value.trim(),mode:state.mode,prompt,targetApp:state.targetApp,targetModel:state.targetModel,optimizeGoal:$('optimizeGoal').value});
  lastAiOutput=data.result||'';$('resultText').textContent=lastAiOutput;
  $('resultSub').textContent=`${data.model} · ${operation==='test'&&state.mode!=='text'?'Prompt critique only; no media generated':operation==='enhance'?'Review changes before accepting':'AI-generated review'}`;
  if(operation==='enhance'){
    $('beforeAfter').hidden=false;$('originalText').textContent=originalAiPrompt;
    const before=approxTokens(originalAiPrompt),after=approxTokens(lastAiOutput),pct=before?Math.round((1-after/before)*100):0;
    $('compareTokens').textContent=`Estimated input prompt tokens: ${before} before → ${after} after (${pct>=0?pct+'% fewer':Math.abs(pct)+'% more'}). Output quality may vary.`;
    $('applyResult').hidden=false;
  }
  $('connectionShort').textContent=`✓ Gemini responded using ${data.model}.`;return data;
 }catch(e){const msg=e.name==='AbortError'?'Request timed out. Try a faster model.':e.message;$('resultText').textContent=`AI request failed: ${msg}`;$('resultSub').textContent='Rule-based prompt creation is still available.';return null;}}
function promptForTroubleshoot(){let failed=$('failedOutput').value.trim();if(!failed){$('troubleshootSection').open=true;$('failedOutput').focus();toast('Paste the failed output or error before diagnosing.');return ''}if(failed.length>3500){toast('Please shorten the failed output to 3,500 characters.');return ''}return failed}
function showModal(title,sub,body){$('resultTitle').textContent=title;$('resultSub').textContent=sub;$('resultText').textContent=body;$('resultModal').hidden=false;$('doneModal').focus()}
function closeModal(){$('resultModal').hidden=true}
function renderGeminiModels(list=null){const preset=[['gemini-3.5-flash-lite','Gemini 3.5 Flash-Lite — efficient'],['gemini-3.6-flash','Gemini 3.6 Flash'],['gemini-3.8-flash','Gemini 3.8 Flash — advanced'],['gemini-3.1-flash-lite','Gemini 3.1 Flash-Lite'],['gemini-4-argon','Gemini 4 Argon — paid API'],['gemini-2.5-flash','Gemini 2.5 Flash — legacy access'],['gemini-2.5-flash-lite','Gemini 2.5 Flash-Lite — legacy access']];const selected=$('model').value;const rows=preset.filter(x=>list===null||list.includes(x[0]));$('model').innerHTML=rows.map(([id,label])=>`<option value="${safe(id)}">${safe(label)}</option>`).join('');if(selected&&rows.some(x=>x[0]===selected))$('model').value=selected;else $('model').value=rows[0]?.[0]||'';}
async function testConnection(){setPage('settings');const btn=$('connectBtn');btn.disabled=true;const old=btn.textContent;btn.textContent='Testing...';
 try{const p=await apiFetch('/api/ai',{operation:'ping',model:$('model').value,apiKey:$('apiKey').value.trim(),accessCode:$('accessCode').value.trim()});$('apiStatus').textContent='Connected';$('apiStatus').classList.add('ok');$('statusDetails').className='small-status good';$('statusDetails').textContent=`✓ Live response from ${p.model}: ${p.result||'OK'}`;$('connectionShort').textContent=`✓ Gemini API ready (${p.model}).`;toast('Gemini AI connection is working.');}
 catch(e){$('apiStatus').textContent='Not connected';$('apiStatus').classList.remove('ok');$('statusDetails').className='small-status error';$('statusDetails').textContent=`⚠ ${e.message}`;toast('Connection test failed. Verify model and account permissions.');}
 finally{btn.disabled=false;btn.textContent=old}}
async function refreshGeminiModels(){const b=$('refreshModels');b.disabled=true;try{const p=await apiFetch('/api/models',{apiKey:$('apiKey').value.trim(),accessCode:$('accessCode').value.trim()});if(!p.models?.length)throw Error('No supported text models appear available for this API key. Check permissions.');renderGeminiModels(p.models);$('modelRefreshStatus').textContent=`✓ ${p.models.length} supported models found for your project. Last checked now.`;toast('Model availability checked.');}catch(e){$('modelRefreshStatus').textContent='⚠ '+e.message;}finally{b.disabled=false}}
function renderTargets(){const mode=state.mode,apps=availableApps(mode);if(!apps.some(a=>a.id===state.targetApp)){state.targetApp=recommendedTargetApp(mode);state.targetModel=recommendedTargetModel(mode,state.targetApp)}
 $('targetApp').innerHTML=apps.map(a=>`<option value="${safe(a.id)}">${safe(a.name)}</option>`).join('');$('targetApp').value=state.targetApp;
 const app=getApp(mode,state.targetApp);if(!app.models.some(m=>m.id===state.targetModel))state.targetModel=app.models[0].id;
 $('targetModel').innerHTML=app.models.map(m=>`<option value="${safe(m.id)}">${safe(m.name)}${m.status==='watch'?' ⚠ Watch':m.status==='legacy'?' · Legacy':m.status==='preview'?' · Preview':''}</option>`).join('');$('targetModel').value=state.targetModel;
 const model=getTargetModel(mode,state.targetApp,state.targetModel);
 $('targetDocsLink').hidden=!app.url; if(app.url)$('targetDocsLink').href=app.url;
 $('targetInfo').textContent=`Status: ${model.status==='account'?'Check availability in your account':model.status==='watch'?'Active at last official check; retirement watch':model.status==='legacy'?'Older version; may have restricted access':model.status==='preview'?'Preview (may change)':'Supported as of last catalog review'} · Verified ${CATALOG_UPDATED}. ${model.description||''}`;
}
let vaultInitStarted=false;
async function initVault(){if(vaultInitStarted)return;vaultInitStarted=true;
 try{const response=await fetch('/api/config',{cache:'no-store'});const cfg=await response.json();
  if(!cfg.vaultEnabled)return;
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.118.0');
  vaultClient=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  $('vaultUnconfigured').hidden=true;
  vaultClient.auth.onAuthStateChange((_,session)=>{queueMicrotask(()=>renderVaultAuth(session?.user||null))});
  const{data}=await vaultClient.auth.getUser();await renderVaultAuth(data?.user||null);
 }catch(e){$('vaultUnconfigured').textContent='Account vault configuration unavailable: '+e.message;}}
async function renderVaultAuth(user){vaultUser=user;$('vaultLogin').hidden=!!user;$('vaultSignedIn').hidden=!user;if(!user)return;$('vaultIdentity').textContent=`Signed in: ${user.email||'your account'}`;
 try{const headers=await authHeader(),resp=await fetch('/api/vault',{headers});const body=await resp.json();if(!resp.ok)throw Error(body.error||'Vault unavailable');$('vaultStatus').textContent=body.saved?'✓ Encrypted Gemini API key saved for this account':'No saved key yet';$('privacyKeyStatus').textContent=body.saved?'Encrypted account vault':'Temporary, or encrypted account vault';}
 catch(e){$('vaultStatus').textContent='Vault error: '+e.message;}}
async function authAction(signup){if(!vaultClient)return toast('Vault is not configured.');const email=$('vaultEmail').value.trim(),password=$('vaultPassword').value;if(!email||password.length<8)return toast('Enter an email and password of at least 8 characters.');
 try{const r=signup?await vaultClient.auth.signUp({email,password}):await vaultClient.auth.signInWithPassword({email,password});if(r.error)throw r.error;if(signup&&!r.data?.session)toast('Account created. Check your email for the verification link.');else{await renderVaultAuth(r.data?.user||null);toast('Signed in.');}}
 catch(e){toast(e.message)}}
async function saveVault(){if(!vaultUser)return toast('Sign in before saving a key.');const key=$('apiKey').value.trim();if(!key)return toast('Paste your API key before saving it.');if(!confirm('Save this API key in your encrypted account vault? You can delete it later.'))return;
 try{await apiFetch('/api/vault',{operation:'save',apiKey:key});$('apiKey').value='';await renderVaultAuth(vaultUser);toast('API key saved securely. You will not need to paste it next time.');}
 catch(e){toast('Could not save key: '+e.message)}}
async function deleteVault(){if(!vaultUser||!confirm('Permanently delete this saved Gemini API key?'))return;
 try{await apiFetch('/api/vault',{operation:'delete'});await renderVaultAuth(vaultUser);toast('Saved key deleted.');}catch(e){toast(e.message)}}
function uploadImage(file){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){toast('Choose PNG, JPG or WebP under 5 MB.');return}if(referenceUrl)URL.revokeObjectURL(referenceUrl);referenceUrl=URL.createObjectURL(file);$('imagePreview').src=referenceUrl;$('imagePreviewWrap').hidden=false;$('imageName').textContent=file.name;state.imageName=file.name;refresh();toast('Local preview added. This image is not uploaded.')}
function removeImage(){if(referenceUrl)URL.revokeObjectURL(referenceUrl);referenceUrl=null;$('referenceImage').value='';$('imagePreview').removeAttribute('src');$('imagePreviewWrap').hidden=true;state.imageName='';refresh()}
function setLanguage(next){language=next;document.documentElement.lang=next==='zh'?'zh':'en';qa('[data-lang]').forEach(b=>b.classList.toggle('selected',b.dataset.lang===next));qa('[data-i]').forEach(el=>{const k=el.dataset.i;el.textContent=labels[language]?.[k]||el.textContent});updateMode();$('breadcrumb').textContent=labels[language]?.[page]||page;toast(next==='zh'?'已切换简体中文（部分高级字段暂保留英文）':'Switched to English')}
function populateInitial(){renderTask();$('goal').value=state.goal;$('rootProblem').value=state.rootProblem;$('depth').value=state.depth;updateMode();renderStep();renderFeature();$('libraryCount').textContent=library.length}
function wire(){
 qa('[data-nav]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.nav)));
 $('menuBtn').addEventListener('click',()=>{$('sidebar').classList.add('open');$('overlay').classList.add('open');$('overlay').hidden=false});$('overlay').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('overlay').classList.remove('open');$('overlay').hidden=true});
 qa('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;state.optimizedPrompt='';customEditing.clear();saveDraft();updateMode()}));
 $('goal').addEventListener('input',e=>setState({goal:e.target.value}));$('rootProblem').addEventListener('input',e=>setState({rootProblem:e.target.value}));$('task').addEventListener('change',e=>setState({task:e.target.value}));
 $('depth').addEventListener('change',e=>setState({depth:e.target.value}));
 $('smartStart').addEventListener('click',smartStart);$('targetApp').addEventListener('change',e=>{state.targetApp=e.target.value;state.targetModel=recommendedTargetModel(state.mode,state.targetApp);state.optimizedPrompt='';renderTargets();saveDraft();refresh();});$('targetModel').addEventListener('change',e=>{state.targetModel=e.target.value;state.optimizedPrompt='';renderTargets();saveDraft();refresh();});
 $('guidedFields').addEventListener('input',e=>{if(e.target.dataset.value||e.target.dataset.custom)handleFieldChange(e)});$('guidedFields').addEventListener('change',e=>{if(e.target.dataset.choice)handleFieldChange(e)});
 $('advancedFields').addEventListener('input',e=>{if(e.target.dataset.value||e.target.dataset.custom)handleFieldChange(e)});$('advancedFields').addEventListener('change',e=>{if(e.target.dataset.choice)handleFieldChange(e)});
 $('advancedBtn').addEventListener('click',()=>{advanced=!advanced;renderGuided()});
 $('smartFill').addEventListener('click',smartFill);$('autoFix').addEventListener('click',applyFix);
 qa('[data-step]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.step);renderStep()}));$('backBtn').addEventListener('click',()=>{step=Math.max(1,step-1);renderStep()});$('nextBtn').addEventListener('click',()=>{if(step===1&&!state.goal.trim()){toast('Add your main idea first.');$('goal').focus();return}if(step<3){step++;renderStep()}else toast('Review the prompt on the right, then copy or test.')} );
 qa('[data-feature]').forEach(b=>b.addEventListener('click',()=>{feature=b.dataset.feature;qa('[data-feature]').forEach(x=>x.classList.toggle('active',x===b));renderFeature()}));
 $('resetBtn').addEventListener('click',()=>{if(!confirm('Clear this draft and start fresh?'))return;state={...EMPTY};customEditing.clear();removeImage();renderTask();$('goal').value='';$('rootProblem').value='';$('depth').value='Balanced';step=1;renderStep();updateMode();saveDraft()});
 $('copyBtn').addEventListener('click',()=>{const d=diagnose(state);if(d.critical&&!confirm(`Preflight found ${d.critical} critical gap(s). Copy this unfinished prompt anyway?`)){step=3;renderStep();return}copyText(finalPrompt())});$('saveBtn').addEventListener('click',saveToLibrary);$('exportBtn').addEventListener('click',()=>{const p=finalPrompt();if(p)download(p,'prompt-builder-'+state.mode+'.txt');else toast('Add a main idea first.')});
 $('libraryItems').addEventListener('click',e=>{const b=e.target.closest('[data-open],[data-delete]');if(!b)return;const id=b.dataset.open||b.dataset.delete,index=library.findIndex(x=>x.id===id);if(index<0)return;if(b.dataset.open){state={...EMPTY,...library[index].data,imageName:''};customEditing.clear();removeImage();$('goal').value=state.goal;$('rootProblem').value=state.rootProblem;$('depth').value=state.depth;renderTask();step=1;renderStep();updateMode();saveDraft();setPage('builder');toast('Saved prompt opened.')}else if(confirm('Delete this saved prompt?')){library.splice(index,1);storeLibrary();renderLibrary();toast('Prompt deleted.')}});
 $('templateItems').addEventListener('click',e=>{const b=e.target.closest('[data-template]');if(!b)return;const template=EXAMPLES[Number(b.dataset.template)];if(!template)return;state={...EMPTY,...template};customEditing.clear();removeImage();$('goal').value=state.goal;$('rootProblem').value=state.rootProblem;$('depth').value=state.depth;renderTask();step=1;renderStep();updateMode();saveDraft();setPage('builder');toast('Template loaded. Please customise the details.')});
 $('librarySearch').addEventListener('input',renderLibrary);$('exportJson').addEventListener('click',()=>download(JSON.stringify({version:'1.2',prompts:library},null,2),'prompt-builder-library.json','application/json'));
 $('importJson').addEventListener('change',e=>{importLibrary(e.target.files[0]);e.target.value=''});
 $('testBtn').addEventListener('click',()=>{const d=diagnose(state);if(d.critical&&!confirm(`Preflight found ${d.critical} critical gap(s). Test anyway?`)){step=3;renderStep();return}aiCall('test')});$('enhanceBtn').addEventListener('click',()=>aiCall('enhance'));$('troubleshootBtn').addEventListener('click',()=>{const x=$('troubleshootSection');x.open=true; if($('failedOutput').value.trim())aiCall('troubleshoot');else $('failedOutput').focus()});$('runTroubleshooter').addEventListener('click',()=>aiCall('troubleshoot'));
 $('closeModal').addEventListener('click',closeModal);$('doneModal').addEventListener('click',closeModal);$('resultModal').addEventListener('click',e=>{if(e.target===$('resultModal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});$('copyResult').addEventListener('click',()=>copyText(lastAiOutput));$('applyResult').addEventListener('click',()=>{if(lastAiOperation!=='enhance'||!lastAiOutput)return;state.optimizedPrompt=lastAiOutput;saveDraft();refresh();closeModal();toast('AI-optimized prompt accepted. You can copy or save it.');});
 $('connectBtn').addEventListener('click',testConnection);$('refreshModels').addEventListener('click',refreshGeminiModels);$('signInVault').addEventListener('click',()=>authAction(false));$('signUpVault').addEventListener('click',()=>authAction(true));$('saveVaultKey').addEventListener('click',saveVault);$('deleteVaultKey').addEventListener('click',deleteVault);$('signOutVault').addEventListener('click',async()=>{if(vaultClient){await vaultClient.auth.signOut();await renderVaultAuth(null);toast('Signed out.');}});$('revealKey').addEventListener('click',()=>{$('apiKey').type=$('apiKey').type==='password'?'text':'password'});$('forgetKey').addEventListener('click',()=>{$('apiKey').value='';$('accessCode').value='';$('apiStatus').textContent='Not tested';$('apiStatus').classList.remove('ok');$('statusDetails').textContent='Temporary keys cleared from this page.';toast('Keys cleared from memory.')});$('clearDraft').addEventListener('click',()=>{if(!confirm('Clear current draft? Library items will stay.'))return;localStorage.removeItem(STORAGE);location.reload()});
 $('referenceImage').addEventListener('change',e=>uploadImage(e.target.files[0]));$('removeImage').addEventListener('click',removeImage);
 qa('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
}
wire();renderGeminiModels();populateInitial();initVault();
