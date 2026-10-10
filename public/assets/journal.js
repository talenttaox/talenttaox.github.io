(() => {
  const input=document.querySelector('#journal-query');
  if(!input)return;
  const entries=[...document.querySelectorAll('[data-journal-entry]')],zh=document.body.dataset.lang==='zh';
  input.addEventListener('input',()=>{
    const words=input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);let count=0;
    entries.forEach(entry=>{const show=words.every(word=>entry.dataset.search.includes(word));entry.hidden=!show;if(show)count++;});
    document.querySelector('#journal-count').textContent=`${count} ${zh?'篇随记':'essays'}`;
    document.querySelector('#journal-empty').hidden=count!==0;
  });
})();
