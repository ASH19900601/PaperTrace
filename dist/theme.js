// Colour themes. Loaded as a blocking script in <head> so the saved theme applies before first paint.
(()=>{
  const KEY='pt-theme',FALLBACK='forest';
  // Browser chrome colour per theme, matching each theme's --topbar token.
  const CHROME={forest:'#f9fbf6',ink:'#ffffff',paper:'#f8f3ea',midnight:'#111815',iris:'#fbfbfe'};
  const root=document.documentElement;
  const saved=()=>{try{const t=localStorage.getItem(KEY);return Object.hasOwn(CHROME,t)?t:FALLBACK}catch{return FALLBACK}};
  function apply(theme){
    root.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',CHROME[theme]);
    document.querySelectorAll('.theme-option').forEach(o=>o.setAttribute('aria-checked',String(o.dataset.themeValue===theme)));
    const label=document.querySelector('.theme-option[data-theme-value="'+theme+'"] b');
    const current=document.getElementById('themeLabel');
    if(label&&current)current.textContent=label.textContent;
  }
  root.dataset.theme=saved();
  document.addEventListener('DOMContentLoaded',()=>{
    const menu=document.getElementById('themeMenu');
    apply(saved());
    if(!menu)return;
    menu.addEventListener('click',e=>{
      const option=e.target.closest('.theme-option');
      if(!option)return;
      apply(option.dataset.themeValue);
      try{localStorage.setItem(KEY,option.dataset.themeValue)}catch{}
      menu.open=false;
    });
    document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});
  });
})();
