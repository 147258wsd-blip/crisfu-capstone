const mongoose = require("mongoose");

/* The spec lists skills as one of the four domains the API manages
   ("projects, skills, incoming contact messages, and a full-featured Blog
   API"), so a skill is a first-class collection rather than a constant in
   the client bundle.

   A skill belongs to a user for the same reason a project does: the write
   endpoints are protected and the ownership middleware has something to
   check. `order` exists because a toolbox reads badly in insertion order —
   the seed sets it so the grid renders the same way it did when it was
   hard-coded in Home.jsx. */
const CATEGORIES = ["Frontend", "Backend", "Tools", "Design", "Other"];

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A skill needs a name"],
      trim: true,
      maxlength: [60, "Skill name is too long"],
    },
    category: {
      type: String,
      required: [true, "A skill needs a category"],
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(", ")}`,
      },
      default: "Frontend",
    },
    /* 1–5, the same scale the toolbox card renders as dots. Kept as a
       number so ?minLevel= and sorting are meaningful. */
    level: {
      type: Number,
      min: [1, "Level cannot be below 1"],
      max: [5, "Level cannot be above 5"],
      default: 3,
    },
    order: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A skill must belong to a user"],
      index: true,
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

/* the public listing is "mine, grouped by category, in display order" */
skillSchema.index({ user: 1, category: 1, order: 1 });

skillSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Skill", skillSchema);
