// 手绘风宠物形象：纯 SVG，无图片依赖，可离线渲染
const FUR = '#F1E1CB'
const FUR_DEEP = '#E4D0B4'
const INK = '#4A3B2E'
const BLUSH = '#E9B4A0'
const EAR = '#DFA598'

function eyes(y) {
  return `
  <g class="blink">
    <ellipse cx="101" cy="${y}" rx="6.4" ry="8.6" fill="${INK}"/>
    <ellipse cx="139" cy="${y}" rx="6.4" ry="8.6" fill="${INK}"/>
    <circle cx="103.4" cy="${y - 3}" r="2" fill="#fff" opacity=".9"/>
    <circle cx="141.4" cy="${y - 3}" r="2" fill="#fff" opacity=".9"/>
  </g>`
}

function face(y) {
  const cy = y + 14
  return `
  <path d="M113 ${cy} L127 ${cy} L120 ${cy + 7} Z" fill="${INK}"/>
  <path d="M120 ${cy + 7} q -6 7 -12 2" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M120 ${cy + 7} q 6 7 12 2" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="84" cy="${cy + 8}" rx="9" ry="5" fill="${BLUSH}" opacity=".45"/>
  <ellipse cx="156" cy="${cy + 8}" rx="9" ry="5" fill="${BLUSH}" opacity=".45"/>`
}

function cat() {
  return `
  <path class="tail-wag" d="M174 178 c 28 -3 36 -28 25 -44" stroke="${FUR_DEEP}" stroke-width="14"
        fill="none" stroke-linecap="round"/>
  <path d="M76 78 L66 26 L112 54 Z" fill="${FUR}" stroke="${FUR_DEEP}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M164 78 L174 26 L128 54 Z" fill="${FUR}" stroke="${FUR_DEEP}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M84 68 L79 40 L102 56 Z" fill="${EAR}" opacity=".85"/>
  <path d="M156 68 L161 40 L138 56 Z" fill="${EAR}" opacity=".85"/>
  <ellipse cx="120" cy="170" rx="54" ry="46" fill="${FUR}"/>
  <circle cx="120" cy="106" r="50" fill="${FUR}"/>
  ${eyes(104)}
  ${face(104)}
  <g stroke="${INK}" stroke-width="1.4" opacity=".5" stroke-linecap="round">
    <path d="M96 124 L72 120"/><path d="M96 130 L74 132"/>
    <path d="M144 124 L168 120"/><path d="M144 130 L166 132"/>
  </g>`
}

function dog() {
  return `
  <path class="tail-wag" d="M172 182 c 26 -8 30 -32 18 -46" stroke="${FUR_DEEP}" stroke-width="15"
        fill="none" stroke-linecap="round"/>
  <ellipse cx="74" cy="104" rx="17" ry="29" fill="${FUR_DEEP}" transform="rotate(-10 74 104)"/>
  <ellipse cx="166" cy="104" rx="17" ry="29" fill="${FUR_DEEP}" transform="rotate(10 166 104)"/>
  <ellipse cx="120" cy="172" rx="54" ry="46" fill="${FUR}"/>
  <circle cx="120" cy="106" r="50" fill="${FUR}"/>
  ${eyes(100)}
  <ellipse cx="120" cy="126" rx="27" ry="19" fill="${FUR_DEEP}"/>
  <ellipse cx="120" cy="117" rx="8.5" ry="6.5" fill="${INK}"/>
  <path d="M120 124 v6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M120 130 q -7 7 -13 1" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M120 130 q 7 7 13 1" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="84" cy="128" rx="9" ry="5" fill="${BLUSH}" opacity=".4"/>
  <ellipse cx="156" cy="128" rx="9" ry="5" fill="${BLUSH}" opacity=".4"/>`
}

function other() {
  return `
  <ellipse cx="120" cy="172" rx="54" ry="46" fill="${FUR}"/>
  <ellipse cx="103" cy="52" rx="12" ry="33" fill="${FUR}" stroke="${FUR_DEEP}" stroke-width="2" transform="rotate(-8 103 52)"/>
  <ellipse cx="137" cy="52" rx="12" ry="33" fill="${FUR}" stroke="${FUR_DEEP}" stroke-width="2" transform="rotate(8 137 52)"/>
  <ellipse cx="103" cy="56" rx="5.5" ry="22" fill="${EAR}" opacity=".8" transform="rotate(-8 103 56)"/>
  <ellipse cx="137" cy="56" rx="5.5" ry="22" fill="${EAR}" opacity=".8" transform="rotate(8 137 56)"/>
  <circle cx="120" cy="110" r="50" fill="${FUR}"/>
  ${eyes(108)}
  ${face(108)}`
}

export function petSVG(type) {
  const body = type === 'dog' ? dog() : type === 'other' ? other() : cat()
  return `<svg viewBox="0 0 240 258" role="img" aria-label="宠物形象">
    <ellipse cx="120" cy="232" rx="56" ry="9" fill="#8a7d68" opacity=".16"/>
    <g class="pet-idle">${body}</g>
  </svg>`
}
