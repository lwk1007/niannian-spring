(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))p(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const a of t.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&p(a)}).observe(document,{childList:!0,subtree:!0});function y(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function p(e){if(e.ep)return;e.ep=!0;const t=y(e);fetch(e.href,t)}})();const i="#F1E1CB",c="#E4D0B4",o="#4A3B2E",s="#E9B4A0",n="#DFA598";function f(l){return`
  <g class="blink">
    <ellipse cx="101" cy="${l}" rx="6.4" ry="8.6" fill="${o}"/>
    <ellipse cx="139" cy="${l}" rx="6.4" ry="8.6" fill="${o}"/>
    <circle cx="103.4" cy="${l-3}" r="2" fill="#fff" opacity=".9"/>
    <circle cx="141.4" cy="${l-3}" r="2" fill="#fff" opacity=".9"/>
  </g>`}function d(l){const r=l+14;return`
  <path d="M113 ${r} L127 ${r} L120 ${r+7} Z" fill="${o}"/>
  <path d="M120 ${r+7} q -6 7 -12 2" stroke="${o}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M120 ${r+7} q 6 7 12 2" stroke="${o}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="84" cy="${r+8}" rx="9" ry="5" fill="${s}" opacity=".45"/>
  <ellipse cx="156" cy="${r+8}" rx="9" ry="5" fill="${s}" opacity=".45"/>`}function $(){return`
  <path class="tail-wag" d="M174 178 c 28 -3 36 -28 25 -44" stroke="${c}" stroke-width="14"
        fill="none" stroke-linecap="round"/>
  <path d="M76 78 L66 26 L112 54 Z" fill="${i}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M164 78 L174 26 L128 54 Z" fill="${i}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M84 68 L79 40 L102 56 Z" fill="${n}" opacity=".85"/>
  <path d="M156 68 L161 40 L138 56 Z" fill="${n}" opacity=".85"/>
  <ellipse cx="120" cy="170" rx="54" ry="46" fill="${i}"/>
  <circle cx="120" cy="106" r="50" fill="${i}"/>
  ${f(104)}
  ${d(104)}
  <g stroke="${o}" stroke-width="1.4" opacity=".5" stroke-linecap="round">
    <path d="M96 124 L72 120"/><path d="M96 130 L74 132"/>
    <path d="M144 124 L168 120"/><path d="M144 130 L166 132"/>
  </g>`}function u(){return`
  <path class="tail-wag" d="M172 182 c 26 -8 30 -32 18 -46" stroke="${c}" stroke-width="15"
        fill="none" stroke-linecap="round"/>
  <ellipse cx="74" cy="104" rx="17" ry="29" fill="${c}" transform="rotate(-10 74 104)"/>
  <ellipse cx="166" cy="104" rx="17" ry="29" fill="${c}" transform="rotate(10 166 104)"/>
  <ellipse cx="120" cy="172" rx="54" ry="46" fill="${i}"/>
  <circle cx="120" cy="106" r="50" fill="${i}"/>
  ${f(100)}
  <ellipse cx="120" cy="126" rx="27" ry="19" fill="${c}"/>
  <ellipse cx="120" cy="117" rx="8.5" ry="6.5" fill="${o}"/>
  <path d="M120 124 v6" stroke="${o}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M120 130 q -7 7 -13 1" stroke="${o}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M120 130 q 7 7 13 1" stroke="${o}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="84" cy="128" rx="9" ry="5" fill="${s}" opacity=".4"/>
  <ellipse cx="156" cy="128" rx="9" ry="5" fill="${s}" opacity=".4"/>`}function x(){return`
  <ellipse cx="120" cy="172" rx="54" ry="46" fill="${i}"/>
  <ellipse cx="103" cy="52" rx="12" ry="33" fill="${i}" stroke="${c}" stroke-width="2" transform="rotate(-8 103 52)"/>
  <ellipse cx="137" cy="52" rx="12" ry="33" fill="${i}" stroke="${c}" stroke-width="2" transform="rotate(8 137 52)"/>
  <ellipse cx="103" cy="56" rx="5.5" ry="22" fill="${n}" opacity=".8" transform="rotate(-8 103 56)"/>
  <ellipse cx="137" cy="56" rx="5.5" ry="22" fill="${n}" opacity=".8" transform="rotate(8 137 56)"/>
  <circle cx="120" cy="110" r="50" fill="${i}"/>
  ${f(108)}
  ${d(108)}`}function h(l){return`<svg viewBox="0 0 240 258" role="img" aria-label="宠物形象">
    <ellipse cx="120" cy="232" rx="56" ry="9" fill="#8a7d68" opacity=".16"/>
    <g class="pet-idle">${l==="dog"?u():l==="other"?x():$()}</g>
  </svg>`}export{h as p};
