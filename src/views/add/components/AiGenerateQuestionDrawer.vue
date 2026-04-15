<template>
  <a-button type="outline" @click="handleClick">AI 生成题目</a-button>
  <a-drawer
    :width="340"
    :visible="visible"
    @ok="handleOk"
    @cancel="handleCancel"
    unmountOnClose
  >
    <template #title>AI 生成题目</template>
    <div>
      <a-form
        :model="form"
        label-align="left"
        auto-label-width
        @submit="handleSubmit"
      >
        <a-form-item label="应用 id">
          {{ appId }}
        </a-form-item>
        <a-form-item field="questionNumber" label="题目数量">
          <a-input-number
            min="0"
            max="20"
            v-model="form.questionNumber"
            placeholder="请输入题目数量"
          />
        </a-form-item>
        <a-form-item field="optionNumber" label="选项数量">
          <a-input-number
            min="0"
            max="6"
            v-model="form.optionNumber"
            placeholder="请输入选项数量"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button
              :loading="submitting"
              type="primary"
              html-type="submit"
              style="width: 120px"
            >
              {{ submitting ? "生成中" : "一键生成" }}
            </a-button>
            <a-button
              :loading="sseSubmitting"
              style="width: 120px"
              @click="handleSSESubmit"
            >
              {{ sseSubmitting ? "生成中" : "实时生成" }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { defineProps, reactive, ref, withDefaults } from "vue";
import API from "@/api";
import { aiGenerateQuestionUsingPost } from "@/api/questionController";
import message from "@arco-design/web-vue/es/message";

interface Props {
  appId: string;
  onSuccess?: (result: API.QuestionContentDTO[]) => void;
  onSSESuccess?: (result: API.QuestionContentDTO) => void;
  onSSEStart?: (event: any) => void;
  onSSEClose?: (event: any) => void;
}

const props = withDefaults(defineProps<Props>(), {
  appId: () => {
    return "";
  },
});

const form = reactive({
  optionNumber: 2,
  questionNumber: 10,
} as API.AiGenerateQuestionRequest);

const visible = ref(false);
const submitting = ref(false);
const sseSubmitting = ref(false);

const handleClick = () => {
  visible.value = true;
};
const handleOk = () => {
  visible.value = false;
};
const handleCancel = () => {
  visible.value = false;
};

/**
 * 提交
 */
const handleSubmit = async () => {
  if (!props.appId) {
    return;
  }
  submitting.value = true;
  const res = await aiGenerateQuestionUsingPost({
    appId: props.appId as any,
    ...form,
  });
  if (res.data.code === 0 && res.data.data.length > 0) {
    if (props.onSuccess) {
      props.onSuccess(res.data.data);
    } else {
      message.success("生成题目成功");
    }
    // 关闭抽屉
    handleCancel();
  } else {
    message.error("操作失败，" + res.data.message);
  }
  submitting.value = false;
};

/**
 * 使用 fetch + ReadableStream 实现 SSE
 */
const handleSSESubmit = async () => {
  if (!props.appId) {
    return;
  }
  sseSubmitting.value = true;
  let closed = false;

  const url =
    "http://localhost:8101/api/question/ai_generate/sse" +
    `?appId=${props.appId}&optionNumber=${form.optionNumber}&questionNumber=${form.questionNumber}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include", // 携带 cookie，实现登录凭证传递
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 关闭抽屉
    handleCancel();
    props.onSSEStart?.(null);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (reader) {
      const { done, value } = await reader.read();
      if (done || closed) break;

      // 流式解码，避免中文乱码
      buffer += decoder.decode(value, { stream: true });

      // 按行分割处理
      const lines = buffer.split("\n");
      // 保留最后一行（可能是不完整的）
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        // SSE 格式: "data: xxx"
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          // 忽略空数据和结束标记 [DONE]
          if (data && data !== "[DONE]") {
            try {
              props.onSSESuccess?.(JSON.parse(data));
            } catch (e) {
              console.error("解析 SSE 数据失败:", e);
            }
          }
        }
      }
    }

    props.onSSEClose?.(null);
  } catch (error) {
    console.error("SSE 连接错误:", error);
    if (!closed) {
      props.onSSEClose?.(error);
    }
  } finally {
    sseSubmitting.value = false;
  }
};
</script>
