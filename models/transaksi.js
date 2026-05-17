'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaksi extends Model {
    static associate(models) {
      Transaksi.belongsTo(models.User, { foreignKey: 'user_id' });
      Transaksi.belongsTo(models.Produk, { foreignKey: 'produk_id' });
    }
  }
  Transaksi.init({
    user_id: DataTypes.INTEGER,
    produk_id: DataTypes.INTEGER,
    jumlah_beli: DataTypes.INTEGER,
    metode: DataTypes.STRING,
    status: DataTypes.ENUM('pending', 'ACC', 'ditolak'),
    tanda_tangan: DataTypes.TEXT,
    tanggal: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Transaksi',
  });
  return Transaksi;
};
