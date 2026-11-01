const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

/* Field names follow the Capstone spec exactly: username, email, password.
   The password column is `select: false` so it never leaves the API by accident. */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [2, "Username must be at least 2 characters"],
      maxlength: [60, "Username is too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.virtual("name").get(function name() {
  return this.username;
});

/* Mongoose 8 no longer passes `next` to async middleware — just await. */
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return { id: this._id.toString(), _id: this._id.toString(), username: this.username, email: this.email };
};

module.exports = mongoose.model("User", userSchema);
