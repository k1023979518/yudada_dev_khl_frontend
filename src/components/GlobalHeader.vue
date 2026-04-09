<template>
  <a-row class="globalHeader" align="center" :wrap="false">
    <a-col flex="auto">
      <a-menu
        mode="horizontal"
        :selected-keys="selectedKeys"
        @menu-item-click="doMenuClick"
      >
        <a-menu-item
          key="0"
          :style="{ padding: 0, marginRight: '38px' }"
          disabled
        >
          <div class="titleBar">
            <img class="logo" src="../assets/logo.png" />
            <div class="title">鱼答答</div>
          </div>
        </a-menu-item>
        <a-menu-item v-for="item in visibleRoutes" :key="item.path">
          {{ item.name }}
        </a-menu-item>
      </a-menu>
    </a-col>
    <a-col flex="100px">
      <div v-if="loginUserStore.loginUser.id">
        {{ loginUserStore.loginUser.userName ?? "无名" }}
      </div>
      <div v-else>
        <a-button type="primary" href="/user/login">登录</a-button>
      </div>
    </a-col>
    <a-col flex="100px">
      <div v-if="loginUserStore.loginUser.id">
        <a-button type="primary" status="danger" @click="handleLogout">
          退出登录
        </a-button>
      </div>
      <div v-else>
        <a-button type="primary" href="/user/login">登录</a-button>
      </div>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { routes } from "@/router/routes";
import { useRouter } from "vue-router";
import { ref } from "vue";
import { useLoginUserStore } from "@/store/userStore";
import checkAccess from "@/access/checkAccess";
import message from "@arco-design/web-vue/es/message";

const loginUserStore = useLoginUserStore();

const router = useRouter();
//当前选中的菜单项
const selectedKeys = ref(["1"]);
//路由跳转时，自动更新选中的菜单项
router.afterEach((to) => {
  selectedKeys.value = [to.path];
});

//展示在菜单栏的路由数组
// 展示在菜单的路由数组
const visibleRoutes = routes.filter((item) => {
  if (item.meta?.hideInMenu) {
    return false;
  }
  // 根据权限过滤菜单
  if (!checkAccess(loginUserStore.loginUser, item.meta?.access as string)) {
    return false;
  }
  return true;
});

//点击菜单跳转到对应页面
const doMenuClick = (key: string) => {
  router.push({
    path: key,
  });
};

// 处理退出登录
const handleLogout = async () => {
  try {
    await loginUserStore.logout();
    message.success("退出登录成功");
    router.push("/user/login");
  } catch (error) {
    message.error("退出登录失败，请重试");
  }
};
</script>

<style scoped>
#globalHeader {
}

.titleBar {
  display: flex;
  align-items: center;
}

.title {
  color: black;
  margin-left: 16px;
}

.logo {
  height: 48px;
}
</style>
