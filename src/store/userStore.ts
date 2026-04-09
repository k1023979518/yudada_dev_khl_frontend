import { defineStore } from "pinia";
import { ref } from "vue";
import { getLoginUserUsingGet } from "@/api/userController";
import ACCESS_ENUM from "@/access/accessEnum";

/**
 * Global login user state.
 */
export const useLoginUserStore = defineStore("loginUser", () => {
  // 1. 修改初始化逻辑：优先从 localStorage 读取
  const savedUser = localStorage.getItem("loginUser");
  const loginUser = ref<API.LoginUserVO>(
    savedUser ? JSON.parse(savedUser) : { userName: "not login" }
  );

  function setLoginUser(newLoginUser: API.LoginUserVO) {
    loginUser.value = newLoginUser;
    // 2. 新增：每次更新用户时，同步存入 localStorage
    localStorage.setItem("loginUser", JSON.stringify(newLoginUser));
  }

  async function fetchLoginUser() {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data.code === 0 && res.data.data) {
        // 3. 修改：使用 setLoginUser 来更新，确保触发持久化
        setLoginUser(res.data.data);
        return;
      }
      // Only set NOT_LOGIN when backend explicitly reports unauthenticated.
      if (res.data.code === 40100) {
        setLoginUser({ userRole: ACCESS_ENUM.NOT_LOGIN });
      }
    } catch (error) {
      // Keep previous state on transient failures.
      console.warn("fetchLoginUser error", error);
    }
  }

  async function logout() {
    // 1. 清除本地存储的用户信息
    localStorage.removeItem("loginUser");

    // 2. 重置 Store 中的状态为初始值
    loginUser.value = { userName: "not login" };
  }

  return { loginUser, setLoginUser, fetchLoginUser, logout };
});
