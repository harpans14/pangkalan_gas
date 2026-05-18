'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TabungTransaksis', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tipe: {
        type: Sequelize.ENUM('titip', 'pinjam'),
        allowNull: false
      },
      nama_pelanggan: {
        type: Sequelize.STRING,
        allowNull: false
      },
      jenis_tabung: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      jumlah: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tanggal: {
        type: Sequelize.DATEONLY
      },
      status: {
        type: Sequelize.ENUM('aktif', 'selesai'),
        defaultValue: 'aktif'
      },
      keterangan: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TabungTransaksis');
  }
};
