<template>
  <div class="wizard">
    <div class="wizard-bar">
      <el-steps :active="step - 1" align-center finish-status="success">
        <el-step title="照片" />
        <el-step title="它叫什么" />
        <el-step title="怎么保存" />
      </el-steps>
    </div>

    <div class="pane">
      <template v-if="step === 1">
        <h3 class="pane-title">先给它一个样子</h3>
        <p class="pane-desc">
          传一张照片，纯色或白底的能抠成贴纸；背景太杂时会整张显示。不想传也可以，它会以手绘的样子出现。
        </p>
        <div class="photo-pick">
          <div class="photo-preview" :class="{ 'is-cut': cutoutState === 'done' }">
            <img v-if="draft.cutout" :src="draft.cutout" alt="抠图预览" class="cut-preview" />
            <img v-else-if="draft.photo" :src="draft.photo" alt="预览" />
            <PetFigure v-else :type="draft.type" />
          </div>
          <div class="photo-actions">
            <label class="btn btn-soft btn-sm">
              选择照片
              <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
            </label>
            <button
              v-if="draft.photo"
              class="btn btn-ghost btn-sm"
              @click="draft.photo = ''; draft.cutout = ''; cutoutState = 'idle'"
            >
              用回手绘
            </button>
          </div>
          <p v-if="cutoutState === 'processing'" class="hint">正在找出画面里的主体…</p>
          <p v-else-if="cutoutState === 'done'" class="hint ok">已抠出主体，它会站在场景里</p>
          <p v-else-if="cutoutState === 'none'" class="hint">
            背景比较复杂，这张先整张显示。换一张纯色或白底的照片，就能抠成贴纸。
          </p>
          <p v-else class="hint">照片只存在这台服务器上，默认私密。</p>
        </div>
      </template>

      <template v-else-if="step === 2">
        <h3 class="pane-title">它叫什么，是个什么样的孩子</h3>

        <label class="field-label">名字</label>
        <el-input v-model="draft.name" maxlength="20" placeholder="例如：豆豆" class="block-gap" />

        <label class="field-label">种类</label>
        <div class="chip-row block-gap">
          <button
            v-for="t in options.types"
            :key="t.key"
            class="chip-pick"
            :class="{ on: draft.type === t.key }"
            @click="draft.type = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <label class="field-label">性格底色</label>
        <div class="persona-row block-gap">
          <button
            v-for="p in options.personas"
            :key="p.key"
            class="persona-pick"
            :class="{ on: draft.personality === p.key }"
            @click="draft.personality = p.key"
          >
            <b>{{ p.label }}</b>
            <i>{{ p.word }}</i>
          </button>
        </div>

        <div class="two-col">
          <div>
            <label class="field-label">它怎么叫你</label>
            <el-input v-model="draft.ownerTitle" maxlength="12" placeholder="主人" />
          </div>
          <div>
            <label class="field-label">从哪天开始</label>
            <input v-model="draft.sinceDate" class="input" type="date" />
          </div>
        </div>
      </template>

      <template v-else>
        <h3 class="pane-title">最后，选择怎么保存</h3>
        <div class="mode-list">
          <button
            class="mode-pick"
            :class="{ on: draft.storageMode === 'private' }"
            @click="draft.storageMode = 'private'"
          >
            <b>私密模式（默认）</b>
            <i>照片只用于这个空间展示，可随时删除，不进入公开页面。</i>
          </button>
          <button
            class="mode-pick"
            :class="{ on: draft.storageMode === 'persistent' }"
            @click="draft.storageMode = 'persistent'"
          >
            <b>长期保存</b>
            <i>照片与记录长期保留，方便以后回看。同样可以随时删除。</i>
          </button>
        </div>

        <div class="summary">
          <div class="summary-pet">
            <PetFigure :photo="draft.photo" :type="draft.type" :alt="draft.name" />
          </div>
          <div>
            <b>{{ draft.name || '未命名' }}</b>
            <span>
              {{ personaText }} · {{ typeText }} · 从 {{ draft.sinceDate }} 开始
            </span>
          </div>
        </div>
        <p class="hint" style="margin-top: 14px">创建后可以随时在「我的」里修改或删除。</p>
      </template>
    </div>

    <div class="wizard-foot">
      <div>
        <button v-if="step > 1" class="btn btn-ghost" @click="step -= 1">上一步</button>
        <a v-else-if="!editing" class="btn btn-ghost" href="/">先看看首页</a>
        <button v-else class="btn btn-ghost" @click="cancel">取消</button>
      </div>

      <button class="btn btn-primary" :disabled="saving" @click="next">
        {{
          saving
            ? '正在保存…'
            : step === 3
              ? editing
                ? '保存修改'
                : '开始陪伴'
              : '下一步'
        }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from '../ui.js'
import { useRouter, useRoute } from 'vue-router'
import PetFigure from '../components/PetFigure.vue'
import { options, pet, loadMe, personaLabel, typeLabel } from '../store.js'
import { api } from '../api.js'
import { shrinkImage, todayStr } from '../format.js'
import { cutoutPet } from '../lib/petCutout.js'

const router = useRouter()
const route = useRoute()
// 通过路由 query 区分「领养」与「修改资料」：/onboarding 领养，/onboarding?edit=1 编辑
const editing = computed(() => route.query.edit === '1')

const step = ref(1)
const saving = ref(false)
const fileInput = ref(null)

const base = editing.value ? pet.value : null

const draft = reactive({
  photo: base?.photo || '',
  cutout: base?.cutout || '',
  name: base?.name || '',
  type: base?.type || 'cat',
  personality: base?.personality || 'friendly',
  ownerTitle: base?.ownerTitle || '主人',
  sinceDate: base?.sinceDate || todayStr(),
  storageMode: base?.storageMode || 'private'
})

const personaText = computed(() => personaLabel(draft.personality))
const typeText = computed(() => typeLabel(draft.type))

// 抠图状态：idle 未上传 / processing 抠图中 / done 已抠出主体 / none 未识别（降级整图）
const cutoutState = ref('idle')
const cutoutProgress = ref(0)

async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  try {
    draft.photo = await shrinkImage(file)
    draft.cutout = ''
    cutoutState.value = 'processing'
    cutoutProgress.value = 0
    // 先白底快速通道，复杂背景再上 BiRefNet 语义抠图
    const res = await cutoutPet(draft.photo, (p) => {
      cutoutProgress.value = p
    })
    if (res.cutout) {
      draft.cutout = res.cutout
      cutoutState.value = 'done'
    } else {
      cutoutState.value = 'none'
    }
  } catch {
    ElMessage.error('这张图读不出来，换一张试试')
  }
  e.target.value = ''
}

async function next() {
  if (step.value === 2 && !draft.name.trim()) {
    ElMessage.warning('先给它起个名字')
    return
  }
  if (step.value < 3) {
    step.value += 1
    return
  }

  saving.value = true
  try {
    await api.savePet({
      name: draft.name.trim(),
      type: draft.type,
      personality: draft.personality,
      ownerTitle: draft.ownerTitle || '主人',
      sinceDate: draft.sinceDate,
      storageMode: draft.storageMode,
      photo: draft.photo,
      cutout: draft.cutout || null
    })
    await loadMe()
    ElMessage.success(editing.value ? '已经改好了' : '它来了')
    router.push(editing.value ? '/profile' : '/companion')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push('/profile')
}
</script>
