// Runs before first paint so a dark choice does not flash light. The string is a constant, not user input.
const INIT =
  'try{if(localStorage.getItem("irun-theme")==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content","#081412")}}catch(e){}';

export function ThemeInit() {
  return <script dangerouslySetInnerHTML={{ __html: INIT }} />;
}
