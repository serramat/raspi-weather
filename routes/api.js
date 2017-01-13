var express = require('express');
var router = express.Router();
var sensor = require('../model/sensor');
var db = require('../model/db');

/* GET current sensor data. */
router.get('/current', function(req, res) {
    res.json(sensor.getCurrent());
});

/* GET last sensor data. */
router.get('/last', function(req, res) {
    res.json(sensor.getLast());
});

//OUTSIDE

/* GET past 24h */
router.get('/past/24h', function(req, res) {
    // Callback...
    db.getPast(24, res);
});

/* GET past week */
router.get('/past/week', function(req, res) {
    db.getPast(24*7, res);
});

/* GET past month */
router.get('/past/month', function(req, res) {
    db.getPast(24*30, res);
});

/* GET past 3 months */
router.get('/past/3month', function(req, res) {
    db.getPast(3*24*30, res);
});

/* GET past 6 months */
router.get('/past/6month', function(req, res) {
    db.getPast(6*24*30, res);
});

/* GET past year */
router.get('/past/year', function(req, res) {
    db.getPast(12*24*30, res);
});

/* GET yesterday vs today */
router.get('/compare/today/yesterday', function(req, res) {
    db.getComparison('today', 'yesterday', res);
});

/* GET week vs today */
router.get('/compare/today/week', function(req, res) {
    db.getComparison('today', 'week', res);
});

/* GET month vs today */
router.get('/compare/today/month', function(req, res) {
    db.getComparison('today', 'month', res);
});

/* GET 6month vs today */
router.get('/compare/today/6month', function(req, res) {
    db.getComparison('today', '6month', res);
});

/* GET year vs today */
router.get('/compare/today/year', function(req, res) {
    db.getComparison('today', 'year', res);
});

// INSIDE

/* GET past 24h */
router.get('/past/24h_Indoor', function(req, res) {
    // Callback...
    db.getPastIndoor(24, res);
});

/* GET past week */
router.get('/past/week_Indoor', function(req, res) {
    db.getPastIndoor(24*7, res);
});

/* GET past month */
router.get('/past/month_Indoor', function(req, res) {
    db.getPastIndoor(24*30, res);
});

/* GET past 3 months */
router.get('/past/3month_Indoor', function(req, res) {
    db.getPastIndoor(3*24*30, res);
});

/* GET past 6 months */
router.get('/past/6month_Indoor', function(req, res) {
    db.getPastIndoor(6*24*30, res);
});

/* GET past year */
router.get('/past/year_Indoor', function(req, res) {
    db.getPastIndoor(12*24*30, res);
});

/* GET yesterday vs today */
router.get('/compare/today/yesterday_Indoor', function(req, res) {
    db.getComparisonIndoor('today', 'yesterday', res);
});

/* GET week vs today */
router.get('/compare/today/week_Indoor', function(req, res) {
    db.getComparisonIndoor('today', 'week', res);
});

/* GET month vs today */
router.get('/compare/today/month_Indoor', function(req, res) {
    db.getComparisonIndoor('today', 'month', res);
});

/* GET 6month vs today */
router.get('/compare/today/6month_Indoor', function(req, res) {
    db.getComparisonIndoor('today', '6month', res);
});

/* GET year vs today */
router.get('/compare/today/year_Indoor', function(req, res) {
    db.getComparisonIndoor('today', 'year', res);
});

module.exports = router;
