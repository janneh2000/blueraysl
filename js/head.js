/* Runs before paint so the reveal animation can hide elements only when
   JavaScript is available. Kept as a file, not inline, so the Content
   Security Policy can stay at script-src 'self'. */
document.documentElement.classList.add("js");
