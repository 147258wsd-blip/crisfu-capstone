/* Who is allowed to write.
   A portfolio has exactly one author; registration exists because the spec
   asks for it, not because the site wants a crowd. So an account is created
   as `member` by default and can only read. The addresses in ADMIN_EMAILS
   are the exception — they are created as `admin` and can write.

   Exact addresses only. A wildcard such as "@test.dev" would hand admin to
   anyone who can register on that domain, which is the bug this file exists
   to close. */

const ROLES = { ADMIN: "admin", MEMBER: "member" };

function adminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).toLowerCase());
}

function roleForEmail(email) {
  return isAdminEmail(email) ? ROLES.ADMIN : ROLES.MEMBER;
}

module.exports = { ROLES, adminEmails, isAdminEmail, roleForEmail };
