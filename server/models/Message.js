const mongoose = require("mongoose");

/* Spec columns: name, email, message.
   Contact form submissions are deliberately detached from User — a visitor
   can write without an account. */
const messageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name is too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [4000, "Message is too long"],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
