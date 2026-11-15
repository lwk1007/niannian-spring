/*
 * 念念 · 桌宠引擎配置
 * 修改后刷新（或重启应用）即生效。桌面端与移动端共用同一份配置。
 *
 * render.mode 三选一：
 *   'svg'    默认。内置 SVG 猫咪，用 CSS 动画实现呼吸/眨眼/摇尾/待机动作，零素材开箱即用。
 *   'image'  单张透明 PNG（例如你的宠物抠图照片），引擎叠加上下浮动呼吸 + 点击反应。
 *   'frames' PNG 序列帧播放（由视频/骨骼导出透明帧），逐动作逐帧，适合精细动画。
 */
window.PET_CONFIG = {
  name: '念念',

  render: {
    mode: 'svg',            // 'svg' | 'image' | 'frames'
    width: 168,             // 宠物显示宽度（px）
    height: 190,            // 宠物显示高度（px）

    // mode === 'image' 时生效：透明 PNG / WebP / GIF 地址（相对路径或 http(s)）
    image: '',

    // mode === 'frames' 时生效：每个动作一组帧。fps 帧率、loop 是否循环、from/to 自动拼文件名（可选）
    frames: [
      // 例：{ action: 'idle', srcs: ['assets/frames/idle_0.png', 'assets/frames/idle_1.png'], fps: 8, loop: true }
    ]
  },

  behavior: {
    idleIntervalMin: 6000,   // 待机动作最短间隔（毫秒）
    idleIntervalMax: 12000,  // 待机动作最长间隔
    idleActions: ['blink', 'look', 'tailwag', 'stretch'], // 待机随机动作池
    clickAction: 'pat',      // 单击触发动作
    doubleClickAction: 'happy', // 双击触发动作
    dragThreshold: 5,        // 移动超过该像素判定为拖拽而非点击

    speech: {
      pat: ['喵~', '想我了吗？', '我在呢。'],
      happy: ['嘿嘿', '好开心', '最喜欢你啦'],
      stretch: ['伸个懒腰~']
    }
  }
};
