/* Prompt Builder target-tool profiles. This is a dated compatibility snapshot,
   NOT a claim that any user account has access to a given model.
   Source links are the provider's own documentation. Last reviewed 2026-10-18.
*/
export const CATALOG_UPDATED='2026-10-18';
const M=(id,name,status='active',description='')=>({id,name,status,description});
export const TARGET_APPS={
 text:[
 {id:'universal',name:'Universal / any chat AI',url:'',models:[M('universal','General-purpose (no version dependency)')]},
 {id:'chatgpt',name:'ChatGPT / OpenAI',url:'https://platform.openai.com/pricing',models:[M('gpt-6.1-sol','GPT-6.1 Sol'),M('gpt-6-luna','GPT-6 Luna (fast)'),M('gpt-6-astra','GPT-6 Astra (advanced)')]},
 {id:'gemini',name:'Google Gemini',url:'https://ai.google.dev/gemini-api/docs/models',models:[M('gemini-3.8-flash','Gemini 3.8 Flash'),M('gemini-3.5-flash-lite','Gemini 3.5 Flash-Lite'),M('gemini-3.6-flash','Gemini 3.6 Flash'),M('gemini-4-argon','Gemini 4 Argon (paid)', 'active','Not included in API free tier'),M('gemini-2.5-flash','Gemini 2.5 Flash (existing users)', 'legacy','Access restricted for new projects')]},
 {id:'claude',name:'Anthropic Claude',url:'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',models:[M('claude-sonnet-5','Claude Sonnet 5'),M('claude-opus-5','Claude Opus 5'),M('claude-fable-5','Claude Fable 5'),M('claude-haiku-4-5-20251001','Claude Haiku 4.5 (watch)', 'watch','Active in last official listing; preservation date has passed')]},
 {id:'perplexity',name:'Perplexity',url:'https://docs.perplexity.ai/',models:[M('latest','Current model in your account','account')]},
 {id:'grok',name:'Grok / xAI',url:'https://docs.x.ai/',models:[M('latest','Current model in your account','account')]},
 {id:'deepseek',name:'DeepSeek',url:'https://api-docs.deepseek.com/',models:[M('latest','Current model in your account','account')]},
 ],
 image:[
 {id:'universal',name:'Universal image tool',url:'',models:[M('universal','Any image generator')]},
 {id:'nano',name:'Google Nano Banana / Flow',url:'https://ai.google.dev/gemini-api/docs/models',models:[M('gemini-nano-banana-2.1','Nano Banana 2.1'),M('gemini-3.1-flash-image','Nano Banana 2'),M('gemini-3.1-flash-lite-image','Nano Banana 2 Lite'),M('gemini-3-pro-image','Nano Banana Pro')]},
 {id:'gptimage',name:'ChatGPT Image / OpenAI',url:'https://platform.openai.com/pricing',models:[M('gpt-image-2.5-flare','GPT Image 2.5 Flare'),M('gpt-image-2.5-sunburst','GPT Image 2.5 Sunburst'),M('gpt-image-2','GPT Image 2')]},
 {id:'midjourney',name:'Midjourney',url:'https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version',models:[M('v8.2','Midjourney V8.2'),M('v8.1','Midjourney V8.1','legacy')]},
 {id:'flux',name:'FLUX / Black Forest Labs',url:'https://docs.bfl.ai/',models:[M('current','Current FLUX image model','account')]},
 {id:'ideogram',name:'Ideogram',url:'https://ideogram.ai/',models:[M('current','Current Ideogram model','account')]},
 {id:'recraft',name:'Recraft',url:'https://www.recraft.ai/',models:[M('current','Current Recraft model','account')]},
 ],
 video:[
 {id:'universal',name:'Universal video generator',url:'',models:[M('universal','General-purpose video')]},
 {id:'flow',name:'Google Flow',url:'https://labs.google/fx/tools/flow',models:[M('gemini-omni-1.1-flash','Gemini Omni Flash'),M('veo-3.1-generate-preview','Veo 3.1','preview'),M('veo-3.1-fast-generate-preview','Veo 3.1 Fast','preview')]},
 {id:'runway',name:'Runway',url:'https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5',models:[M('gen4.5','Runway Gen-4.5'),M('seedance2_5','Seedance 2.5 on Runway'),M('hailuo3','Hailuo 3.0 on Runway')]},
 {id:'hailuo',name:'Hailuo AI / MiniMax',url:'https://docs.dev.runwayml.com/api-details/api_changelog/',models:[M('hailuo3','Hailuo 3.0 (check platform availability)','account'),M('hailuo2.3','Hailuo 2.3','account')]},
 {id:'kling',name:'Kling AI',url:'https://klingai.com/',models:[M('current','Latest model shown in Kling','account')]},
 {id:'pika',name:'Pika',url:'https://pika.art/faq',models:[M('pika-2.2','Pika 2.2 (verify account)','account'),M('current','Current Pika model in your account','account')]},
 {id:'sora',name:'OpenAI Sora',url:'https://platform.openai.com/docs/models',models:[M('sora-2','Sora 2 (verify availability)','account'),M('sora-2-pro','Sora 2 Pro (verify availability)','account')]},
 ],
};
TARGET_APPS.image2video=TARGET_APPS.video;
export const availableApps=mode=>TARGET_APPS[mode]||TARGET_APPS.text;
export const getApp=(mode,id)=>availableApps(mode).find(a=>a.id===id)||availableApps(mode)[0];
export const getTargetModel=(mode,appId,modelId)=>getApp(mode,appId).models.find(m=>m.id===modelId)||getApp(mode,appId).models[0];
export const recommendedTargetApp=mode=>({text:'universal',image:'nano',video:'flow',image2video:'flow'})[mode]||'universal';
export const recommendedTargetModel=(mode,app)=>getApp(mode,app).models[0].id;
export function targetGuidance(mode,appId,modelId){
 const model=getTargetModel(mode,appId,modelId), notes=[];
 if(mode==='image'){
  if(appId==='midjourney')notes.push('Write a concise visual scene with clear aesthetics and subject placement; apply version/aspect settings in Midjourney as supported.');
  else if(appId==='nano')notes.push('Describe visible composition, materials and precise text; attach reference images directly in the destination tool.');
  else if(appId==='gptimage')notes.push('Use natural-language edit or creation instructions; prioritise scene geometry, subject identity and legible lettering.');
 }else if(mode==='video'||mode==='image2video'){
  if(appId==='runway')notes.push(mode==='image2video'?'Runway image-to-video: focus on motion and camera; do not redescribe the uploaded reference image.':'Runway text-to-video: specify both the visual scene and its movement.');
  if(appId==='flow')notes.push('For Flow: select the actual model and supported input mode in Flow; describe camera movement, one coherent action and audio only when available.');
  if(appId==='hailuo')notes.push('For Hailuo: use a coherent action, stable subject, continuity and controlled camera movement.');
  if(appId==='pika')notes.push('For Pika: favour short observable actions, and specify first/last frames only in supported workflows.');
  if(mode==='image2video')notes.push('Upload the reference image in the destination application; this builder does not send or embed it.');
  if(model.id.includes('veo-3.1'))notes.push('Veo 3.1 generates 4, 6 or 8-second clips; reference-images or high resolution generally require 8 seconds.');
 }else{
  if(appId==='perplexity')notes.push('Request dated sources and distinguish citations from unsupported claims.');
  if(appId==='claude')notes.push('Use explicit evidence boundaries and clear acceptance criteria.');
 }
 if(model.status==='watch'||model.status==='legacy')notes.push('Check model lifecycle and availability before use; consider an active alternative.');
 return notes.join(' ');
}
