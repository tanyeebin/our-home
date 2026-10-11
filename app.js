(() => {
  const tasks = [
    ['sleep','Take a five-second nap','The bed is always here when you need a little rest.','🛏️',5000],['hug-bear','Give the teddy a hug','A soft hug from your favorite bear.','🧸',3000],['hug-swan','Hug the little swan','A tiny cuddle for a softer moment.','🦢',3000],['photo','Polish our favorite photo','Wipe away the little smudges and find our memory again.','🖼️',3500],['clothes','Pick a comfy outfit','Choose whatever color feels like you today.','👗',2200],['skincare','Do a little face care','Take a few minutes just for yourself.','🧴',5000],['toilet','Take a bathroom break','A little pause for a basic need.','🚽',3000],['water-play','Play with a little water','A tiny splash of silliness.','💦',3000],['wash-hands','Wash your hands','Warm water, a little soap, a fresh start.','🫧',3000],['brush-teeth','Brush your teeth','Your toothbrush and cup are waiting.','🪥',3000],['shower','Take a quick shower','Let the warm water wash the day away.','🚿',5000],['bath','Have a cozy bath','Bubbles, quiet, and nowhere else to be.','🛁',7000],['tv','Watch something cozy','Put your feet up and let the show begin.','📺',6000],['laundry','Start a little laundry','The washer can take care of this one.','🧺',5000],['game','Play a two-player game','Pick up a controller and play together.','🎮',6000],['rest','Rest on the sofa','The fluffy husky rug says you can stay awhile.','🛋️',5000],['treats','Have a little sweet','Choose chocolate or a candy from the bowl.','🍫',2500],['fertilize','Give the flowers plant food','Help a little color grow outside.','🌱',4500],['water','Water the flowers','The flowers could use a tiny drink.','🌷',4500],['music','Put on a favorite song','A little music can make this room feel softer.','🎵',1500],['work','Do one tiny bit of work','Sit down, then give yourself permission to stop.','💻',5000],['read','Read a few pages','Pick a book from either shelf.','📚',4000],['mirror','Take a look in the mirror','A reminder that you are lovely, exactly as you are.','🪞',3000],['makeup','Have fun with makeup','Play with colors just because you can.','💄',5000],['drink-water','Have a glass of water','A small sip is a good place to start.','🥛',2500],['coffee','Make a little coffee','A warm cup, made just the way you like it.','☕',3000],['cook','Cook a sunny-side-up egg','Make the kitchen smell like a slow morning.','🍳',5000],['eat','Sit down for a little meal','There is always room for one more at the table.','🍽️',4000],['dishes','Let the dishwasher help','One less thing to carry in your head.','🫧',4000],['fridge','Pick a snack from the fridge','Fruit, cheese, cucumber, or something sweet?','🍓',2200],['pet','Give Mochi a little pat','Mochi has been hoping you would stop by.','🐕',1200],['feed','Give Mochi a little snack','Mochi is doing a very good sit.','🥣',4000]
  ];
  const byAction = Object.fromEntries(tasks.map(task => [task[0], task]));
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const audio = $('#audioPlayer');
  const questList = $('#questList');
  const toastNode = $('#sceneToast');
  const modal = $('#modalBackdrop');
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('cozy-home-save') || '{}'); } catch {}
  const state = saved.date === todayKey ? saved : {date:todayKey, xp:saved.xp||0, done:[], today:[]};
  if (!Array.isArray(state.done)) state.done = [];
  if (!Array.isArray(state.today) || !state.today.length) state.today = [...tasks].sort(() => Math.random()-.5).slice(0,3).map(task => task[0]);
  let actor = 'him', toastTimer, busy = false;

  $('#todayDate').textContent = new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
  function save(){ try { localStorage.setItem('cozy-home-save',JSON.stringify(state)); } catch {} }
  function nextLevel(level){ return level*10; }
  function levelInfo(xp){ let level=1,rest=xp; while(rest>=nextLevel(level)){rest-=nextLevel(level);level++;} return {level,rest,needed:nextLevel(level)}; }
  function render(){
    questList.innerHTML=state.today.map(id=>{const task=byAction[id],done=state.done.includes(id);return `<div class="quest-row ${done?'done':''}" data-quest="${id}"><button class="quest-check" aria-label="${done?'Completed':'Start'}: ${task[1]}" data-start="${id}">${done?'✓':''}</button><div class="quest-info"><b>${task[1]}</b><small>${done?'A little moment, all yours.':task[2]}</small></div><span class="quest-reward">${done?'DONE':'✦ +5'}</span></div>`;}).join('');
    const level=levelInfo(state.xp);$('#levelNumber').textContent=level.level;$('#levelBadge').textContent=`LV. ${level.level}`;$('#xpLabel').textContent=`${level.rest} / ${level.needed} little stars`;$('#progressFill').style.width=`${Math.min(100,level.rest/level.needed*100)}%`;$('#totalXp').textContent=state.xp;save();
  }
  function toast(title,text,emoji='💛'){ $('#toastTitle').textContent=title;$('#toastText').textContent=text;$('#toastEmoji').textContent=emoji;toastNode.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastNode.classList.remove('show'),4200); }
  function complete(action){ if(!state.today.includes(action)||state.done.includes(action))return;state.done.push(action);state.xp+=5;render();toast('Little quest complete!','You earned 5 little stars. Look at you go!','✦'); }
  const messages={sleep:'Rest well, love.', 'hug-bear':'A warm, squishy hug.','hug-swan':'A little softness goes a long way.',skincare:'You deserve gentle care, too.','toilet':'A little pause for a basic need.','water-play':'A tiny splash of silliness.','wash-hands':'Fresh hands, fresh start.','brush-teeth':'Look at you, taking care of you.',shower:'You can let some of that tension go.',bath:'Stay as long as you need.',tv:'Nothing else needs your attention right now.',laundry:'One less thing to think about.',game:'A little play, together.',rest:'You have permission to sit for a while.',water:'A little drink for the flowers.',fertilize:'Small care helps things bloom.',work:'One small step is enough.',read:'Take your time with the story.',mirror:'You are more than enough.',makeup:'There is no wrong way to play.','drink-water':'That was a good thing to do for yourself.',coffee:'A warm little pick-me-up.',cook:'Something lovely is on the way.',eat:'Pull up a chair, sweetheart.',dishes:'The kitchen feels lighter already.',feed:'Mochi says thank you!','pet':'A tail wag and a tiny heart, just for you.'};
  function begin(action, detail){
    if(busy)return;
    if(action==='fridge'&&!detail)return openChoices('fridge');
    if(action==='treats'&&!detail)return openChoices('treats');
    if(action==='photo'&&!detail)return openPhoto();
    if(action==='music')return openMusic();
    if(action==='door'||action==='garden-door'){window.cozyToggleDoor?.();toast('The garden door','A little fresh air is coming in.','🚪');return;}
    const task=byAction[action],duration=task?task[4]:3000;busy=true;
    const message=detail?.message||messages[action]||'A small moment, just for you.';
    toast(detail?.title||task?.[1]||'A little moment',`${message} ✦`,task?.[3]||'💛');
    const activity=window.cozyStartActivity?.(action,actor,duration);
    if(!activity){busy=false;toast('Let’s try that again','The little room could not find a clear path.','♡');return;}
    Promise.resolve(activity).then(result=>{busy=false;if(result?.ok)complete(action);else toast('Let’s try that again','The little room could not find a clear path.','♡');}).catch(()=>{busy=false;toast('A tiny pause','That interaction got interrupted. Try once more when you are ready.','♡');});
  }
  window.cozyBeginAction=(action,detail)=>begin(action,detail);
  window.cozySelectActor=id=>{actor=id;toast(id==='him'?'You are in charge of him now':'You are in charge of her now','Tap something in the home to choose a little activity.','♡');};

  function openChoices(type){
    const options=type==='fridge'?[['🍓','Fruit'],['🧀','Cheese'],['🥒','Cucumber'],['🍫','Chocolate'],['🍎','Apple juice'],['🍷','A little wine']]:[['🍫','Chocolate'],['🍬','Candy']];
    $('#modalEmoji').textContent=type==='fridge'?'🧊':'🍬';$('#modalTitle').textContent=type==='fridge'?'Open the fridge':'Choose a little treat';$('#modalPrompt').textContent=type==='fridge'?'What sounds good right now?':'A little something sweet, just because.';
    $('#choiceGrid').innerHTML=options.map(([emoji,label])=>`<button class="choice-button" data-choice="${label}"><span>${emoji}</span>${label}</button>`).join('');modal.hidden=false;
    $$('[data-choice]').forEach(button=>button.onclick=()=>{const name=button.dataset.choice;closeModal();begin(type==='fridge'?'fridge':'treats',{title:`A little ${name.toLowerCase()}`,message:`Enjoy your ${name.toLowerCase()}—you deserve a nice little thing.`});});
  }
  function openMusic(){
    $('#modalEmoji').textContent='🎵';$('#modalTitle').textContent='A little music';$('#modalPrompt').textContent='One song is tucked into this home for you.';$('#choiceGrid').innerHTML='<button class="choice-button" data-music="play"><span>🎶</span>Play our song</button><button class="choice-button" data-music="pause"><span>🔕</span>Pause the music</button>';modal.hidden=false;
    $$('[data-music]').forEach(button=>button.onclick=()=>{closeModal();if(button.dataset.music==='play')playMusic();else pauseMusic();if(busy)return;busy=true;const activity=window.cozyStartActivity?.('music',actor,1500);if(!activity){busy=false;return;}Promise.resolve(activity).then(result=>{busy=false;if(result?.ok)complete('music');});});
  }
  function openPhoto(){
    $('#modalEmoji').textContent='🖼️';$('#modalTitle').textContent='Our favorite memory';$('#modalPrompt').textContent='Rub the little smudges away with your finger.';$('#choiceGrid').innerHTML='<div class="photo-clean-wrap"><img src="assets/our-photo.jpg" alt="Our favorite photo"><canvas id="smudgeCanvas"></canvas></div><button class="choice-button photo-done"><span>♡</span>All clean</button>';modal.hidden=false;
    const canvas=$('#smudgeCanvas'),ctx=canvas.getContext('2d');canvas.width=290;canvas.height=310;ctx.fillStyle='rgba(206,190,160,.42)';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<85;i++){ctx.beginPath();ctx.fillStyle=`rgba(132,109,83,${Math.random()*.22})`;ctx.arc(Math.random()*canvas.width,Math.random()*canvas.height,4+Math.random()*20,0,Math.PI*2);ctx.fill();}
    let drawing=false;const wipe=e=>{if(!drawing)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(x,y,23,0,Math.PI*2);ctx.fill();};
    canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);wipe(e);};canvas.onpointermove=wipe;canvas.onpointerup=()=>drawing=false;
    $('.photo-done').onclick=()=>{closeModal();begin('photo',{title:'A favorite memory',message:'A little reminder of the love you carry with you.'});};
  }
  function closeModal(){modal.hidden=true;}
  function setMusicUI(playing){$('#musicIcon').textContent=playing?'♫':'♪';$('#musicNotes').classList.toggle('playing',playing);}
  function playMusic(){audio.play().then(()=>{setMusicUI(true);toast('Our song is playing','A little music, right here with you.','🎵');}).catch(()=>toast('Tap play to start the song','Your browser is waiting for a little tap.','🎵'));}
  function pauseMusic(){audio.pause();setMusicUI(false);toast('A quiet little room','The music is paused whenever you need silence.','🔕');}
  $('#musicButton').onclick=()=>audio.paused?playMusic():pauseMusic();$('#songPicker').onclick=openMusic;$('#closeToast').onclick=()=>toastNode.classList.remove('show');$('#modalClose').onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal();};document.onkeydown=e=>{if(e.key==='Escape')closeModal();};
  questList.onclick=e=>{const button=e.target.closest('[data-start]');if(button&&!state.done.includes(button.dataset.start))begin(button.dataset.start);};
  $('#resetView').onclick=()=>window.cozyResetView?.();
  audio.volume=.33;audio.play().then(()=>setMusicUI(true)).catch(()=>setMusicUI(false));
  render();
})();
