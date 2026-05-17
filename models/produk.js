'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produk extends Model {
    static associate(models) {
      Produk.belongsTo(models.User, { foreignKey: 'createdBy' });
      Produk.hasMany(models.Transaksi, { foreignKey: 'produk_id' });
    }
  }
  Produk.init({
    nama: DataTypes.STRING,
    harga: DataTypes.INTEGER,
    stok: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Produk',
  });
  return Produk;
};
