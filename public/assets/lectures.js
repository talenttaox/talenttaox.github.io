(() => {
  const toc=document.querySelector('.toc-panel');
  if(!toc)return;
  const mobile=window.matchMedia('(max-width:760px)');
  if(mobile.matches)toc.open=false;
  // Native details keeps the outline usable without JavaScript.
  toc.querySelectorAll('a[href^="#"]').forEach(link=>{
    link.addEventListener('click',event=>{
      const target=document.getElementById(link.hash.slice(1));
      if(!target)return;
      event.preventDefault();
      if(mobile.matches)toc.open=false;
      history.pushState(null,'',link.hash);
      target.focus({preventScroll:true});
      target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
    });
  });
  document.querySelectorAll('.prose table').forEach(table=>{
    const wrapper=document.createElement('div');
    wrapper.className='table-scroll';wrapper.tabIndex=0;
    wrapper.setAttribute('role','region');
    wrapper.setAttribute('aria-label',document.body.dataset.lang==='zh'?'讲义表格，可横向滚动':'Lecture table, scroll horizontally');
    table.before(wrapper);wrapper.append(table);
  });
})();
