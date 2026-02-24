/**
 * Auth module — Handles login, session, and role-based routing.
 */
const Auth = (() => {
    const SESSION_KEY = 'am_session';

    function login(email, password) {
        return API.login(email, password).then(result => {
            if (result.success) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
            }
            return result;
        });
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }

    function getUser() {
        const data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }

    function isLoggedIn() {
        return !!getUser();
    }

    function getRole() {
        const user = getUser();
        return user ? user.role : null;
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    return { login, logout, getUser, isLoggedIn, getRole, requireAuth };
})();
