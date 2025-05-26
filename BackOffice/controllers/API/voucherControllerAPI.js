const Voucher = require("../../models/Voucher");
const voucherController = require("../../controllers/voucherController");

const voucherControllerAPI = {};

voucherControllerAPI.createVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    const newVoucher = await voucherController.createVoucher(voucherData);
    res.status(201).json(newVoucher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

voucherControllerAPI.getVouchers = async (req, res) => {
  try {
    const criteria = req.query;
    const vouchers = await voucherController.getVouchers(criteria);
    res.status(200).json(vouchers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

voucherControllerAPI.getVoucher = async (req, res) => {
  try {
    const criteria = req.params;
    const voucher = await voucherController.getVoucher(criteria);
    res.status(200).json(voucher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

voucherControllerAPI.updateVoucher = async (req, res) => {
  try {
    const id = req.params.id;
    const voucherData = req.body;
    const updatedVoucher = await voucherController.updateVoucher(id, voucherData);
    res.status(200).json(updatedVoucher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = voucherControllerAPI;
