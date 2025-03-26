const crypto = require('crypto');

const user = require('../models/users');

let userController = {};

userController.createUser = (user) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64, 'sha512').toString('hex');
    user.salt = salt;
    user.password = hash;
    let newUser = new User(user);
    return newUser.save();
};

userController.updateUser = (criteria, user) => {
    if (user.password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(user.password, salt, 1000, 64, 'sha512').toString('hex');
      user.salt = salt;
      user.password = hash;
    }
    return user.findOneAndUpdate(criteria, user).exec();
  }