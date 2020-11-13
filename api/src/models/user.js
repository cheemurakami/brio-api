import Joi from '@hapi/joi';
import Bcrypt from 'bcryptjs';
import Promise from 'bluebird';
import Boom from '@hapi/boom';
import uuidv4 from 'uuid/v4';

import Core from '../../core';
import { BaseModel } from './base';
import { Session } from './session';
// import JSONAPIUtil from '../utils/jsonapi';

const { DBUtil } = Core.utils;

const TABLE_NAME = 'users';

export class User extends BaseModel {
  static get TABLE_NAME() {
    return TABLE_NAME;
  }

  get tableName() {
    return TABLE_NAME;
  }

  get soft() {
    return ['deleted_at'];
  }

  // Relations
  sessions() {
    return this.hasMany(Session);
  }

  static withRolesScope(roles) {
    return (qb) => {
      qb.whereRaw('users.scope @> ?', [roles]);
    };
  }

  static encrypt(password) {
    const salt = Bcrypt.genSaltSync();
    const hash = Bcrypt.hashSync(password, salt);
    return hash;
  }

  static validate(user) {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      username: Joi.string().max(12).required(),
      uuid: Joi.string().min(36).max(36).required(),
      scope: Joi.array().items(Joi.string()),
      confirmation_sent_at: Joi.object().allow(null),
    });
    return Joi.validate(user, schema);
  }

  static async createOne(props) {
    const defaults = {
      uuid: uuidv4(),
      password: uuidv4(),
      scope: [],
      confirmation_sent_at: new Date(),
    };
    const data = { ...defaults, ...props };
    const { error } = this.validate(data);

    if (error) {
      return Promise.reject(
        Boom.badRequest('User validation failed', error.message, null),
      );
    }

    const user = await User.findByEmail(data.email);
    if (user != null) {
      return Promise.reject(
        Boom.conflict(`User with email: ${data.email}, already exists`),
      );
    }

    data.email = data.email.toLowerCase();
    data.password = User.encrypt(data.password);

    return this.create(data);
  }

  static findByEmail(email) {
    return this.findOne(
      {},
      {
        email: email.toLowerCase(),
      },
    );
  }

  static activateByEmail(email) {
    return Core.models.DB.knex(TABLE_NAME)
      .where('email', '=', email.toLowerCase())
      .update({
        confirmation_sent_at: null,
      });
  }

  static changePasswordByEmail(email, password) {
    const encryptedPassword = User.encrypt(password);
    return Core.models.DB.knex(TABLE_NAME)
      .where('email', '=', email.toLowerCase())
      .update({ password: encryptedPassword });
  }

  static async authenticate(email, password, roles = []) {
    const user = await User.query((qb) => {
      if (roles.length) {
        User.withRolesScope(roles)(qb);
      }
      qb.where('users.email', '=', email.toLowerCase());
    }).fetch();

    if (user && Bcrypt.compareSync(password, user.attributes.password)) {
      return user;
    }

    return null;
  }

  static inviteAttrs(data) {
    return {
      uuid: uuidv4(),
      username: data.username,
      email: data.email.toLowerCase(),
      password: DBUtil.randomPassword(),
      confirmation_sent_at: new Date(),
      created_by: data.created_by,
    };
  }

  static async signup(email, createdBy) {
    const user = await this.findByEmail(email);
    if (user) {
      throw Boom.badRequest(
        'Account with this email is already registered, please sign in or reset your password ',
      );
    }

    const attrs = this.inviteAttrs({ email, created_by: createdBy });

    return this.forge(attrs).save();
  }
}

export default User;
