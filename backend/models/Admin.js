<<<<<<< HEAD
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    default: 'admin'
  },
  password: {
    type: String,
    required: true
  },
  // ── Role-based access control ─────────────────────────────────────────
  // null role = legacy/original admin account, treated as super admin
  // (full access) for backward compatibility with installs that existed
  // before roles were added. New admins created via /admin/team should
  // always be given an explicit AdminRole.
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminRole', default: null },
  email: { type: String, default: '', trim: true, lowercase: true },
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Admin', adminSchema);
=======
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    default: 'admin'
  },
  password: {
    type: String,
    required: true
  },
  // ── Role-based access control ─────────────────────────────────────────
  // null role = legacy/original admin account, treated as super admin
  // (full access) for backward compatibility with installs that existed
  // before roles were added. New admins created via /admin/team should
  // always be given an explicit AdminRole.
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminRole', default: null },
  email: { type: String, default: '', trim: true, lowercase: true },
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Admin', adminSchema);
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
