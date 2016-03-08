/**
* Pendanter.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  attributes: {
    pname: {
      type: 'string',
      unique:true,
      required: true
    },
    dirname: {
      type: 'string',
      required:true
    },
    opt: {//优化质量参数 50-100
      type: 'string',
      required:true
    },
    datetime: {
      type: 'string',
      required:true
    }
  }
};

