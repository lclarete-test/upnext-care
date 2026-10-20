(()=>{
 const root=document.documentElement;
 const lang=root.dataset.contentLanguage;
 if(!lang||!root.dataset.languagePaths)return;
 const paths=JSON.parse(root.dataset.languagePaths);
 const requested=new URLSearchParams(location.search).get('lang');
 if(paths[requested]&&requested!==lang){location.replace(paths[requested]+location.hash);return;}
 if(window.UpNextPublicNav)window.UpNextPublicNav.update(lang);
 const select=document.getElementById('public-language');
 if(select){select.value=lang;select.onchange=()=>{location.href=paths[select.value]+location.hash;};}
 const label=document.getElementById('language-label');
 if(label)label.textContent={en:'Language',pt:'Idioma',es:'Idioma'}[lang];
 const brand=document.querySelector('.unified-brand');if(brand)brand.href='/?lang='+lang;
 const learn=document.querySelector('.unified-header nav a:last-child');
 if(learn)learn.href=lang==='en'?'/learn/':'/learn/'+lang+'/';
})();
