'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const totals = { '3Kg': 160, '5Kg': 20, '12Kg': 10 };
    for (const [jenis, total] of Object.entries(totals)) {
      await queryInterface.bulkUpdate('TabungStoks', { total }, { jenis });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('TabungStoks', { total: 0 }, {});
  }
};
