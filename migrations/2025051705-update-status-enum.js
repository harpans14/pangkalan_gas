'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Transaksis', 'status', {
      type: Sequelize.ENUM('pending', 'ACC', 'ditolak', 'disetujui', 'selesai'),
      defaultValue: 'pending'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Transaksis', 'status', {
      type: Sequelize.ENUM('pending', 'ACC', 'ditolak'),
      defaultValue: 'pending'
    });
  }
};
