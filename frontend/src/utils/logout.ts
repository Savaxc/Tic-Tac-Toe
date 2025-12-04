export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("sessionId");
  window.location.href = "/login";
};
