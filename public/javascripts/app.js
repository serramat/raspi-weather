var config = {
    /**
     * Frequency of measurement in minutes
     * Note: it's only needed for the graph intervals, doesn't set the logging interval.
     * You have to edit your crontab for that.
     */
    measurementInterval: 30,

    /**
     * fahrenheit or celsius
     * If you change this to fahrenheit, make sure you change the color zones below as well!
     */
    unit: 'celsius',

    /**
     * Coordinates for getting outside weather data from darksky.net
     * By default, location is determined by HTML5 geolocation,
     * but as a fallback it relies on manual coordinates.
     *
     * You can disable geolocation and provide coordinates if you want.
     */
    useGeoLocation: true,
    latitude: 47.51,
    longitude: 19.09,

    /**
     * Color zones for the graph lines.
     * Adjust to your climate and season.
     * The number means the upper bound of the interval.
     * 
     * Default values and meanings:
     * Low (yellow)......: 0-21
     * Medium (orange)...: 21-25
     * High (red)........: 26-99
     */
    zones: {
        low: 21,
        med: 25,
        high: 99
    },

    /**
     * Dark Sky API key.
     * Please don't abuse this. Be a good guy and request your own at https://darksky.net/dev
     */
    APIKey: '262d0436a1b2d47e7593f0bb41491b64',
    /* Forecast.io language for data retrieval */
    lang: 'en',

    // Limits of the night plotband (the gray area on the graphs)
    nightStart: 0,
    nightEnd: 9,

    // Used in chartComplete() to delay loading current sensor data
    numOfCharts: 2,
    loadedCharts: [ ]
};

var globalHighchartsOptions = {
    chart: {
        type: 'spline',
        zoomType: 'x',
        // To prevent the humidity axis to have ticks over 100:
        alignTicks: false, 
        marginLeft: 110,
        marginRight: 50,
        events: {
            load: chartComplete
        }
    },
    xAxis: {
        // Note: useUTC option is set to false during initialization,
        // because Highcharts only allows that with Highcharts.setOptions(),
        // that's why it's missing from this config object
        type: 'datetime',
        plotBands: [ ]
    },
    yAxis: [{
        title: {
            text: 'Temperature (°C)',
            margin: 5,
            style: {
                fontWeight: 'bold'
            }
        },
        opposite: true,
        tickInterval: config.unit === 'celsius' ? 1 : 10
    },
    {
        title: {
            text: 'Humidity (%)',
            margin: 5,
            style: {
                fontWeight: 'bold'
            }
        },
        min: 0,
        max: 100,
        // To prevent the humidity axis to have unrealistic ticks: only 0, 50, 100
        tickAmount: 3
    },
    {
        title: {
            text: 'Pressure (hPa)',
            margin: 5,
            style: {
                fontWeight: 'bold'
            }
        },
        offset: 50
    }],
    series: [{
            name: 'Temperature',
            yAxis: 0,
            data: [ ],
            lineWidth: 4,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '°C'
            },
            color: '#F18324',
            zones: [{
                value: config.zones.low,
                color: '#F1AE24'
            },
            {
                value: config.zones.med,
                color: '#F18324'
            },
            {
                value: config.zones.high,
                color: '#F2552E'
            }]
        },
        {
            name: 'Humidity',
            yAxis: 1,
            data: [],
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%'
            },
            color: '#869BCE'
        },
        {
            name: 'Pressure',
            yAxis: 2,
            data: [],
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: 'hPa'
            },
            color: '#55d0a1'
        }

    ],
    legend: {
        align: 'left',
        verticalAlign: 'bottom',
        y: 22
    },
    tooltip: {
        shared: true,
        crosshairs: true
    },
    title: {
        text: ''
    }
};

var stats = {
    today: {
        temperature: {
            avg: 0
        },
        humidity: {
            avg: 0
        },
        pressure: {
            avg: 0
        }
    },
    interval: {
        temperature: {
            avg: 0
        },
        humidity: {
            avg: 0
        },
        pressure: {
            avg: 0
        }
    },
    logged_days: 0
};

function loadChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            displayError(json.error, DOMtarget);
            return;
        }

        if(json.data.length === 0) {
            displayError('No data to display.', DOMtarget);
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        $.each(json.data, function(index, el) {
            var m = moment.utc(el.timestamp, 'YYYY-MM-DD HH:mm:ss').local();

            // Populating the series
            options.series[0].data.push([
                m.valueOf(),
                format(el.temperature)
            ]);

            options.series[1].data.push([
                m.valueOf(),
                el.humidity
            ]);

	    options.series[2].data.push([
                m.valueOf(),
                format(el.pressure)
            ]);

            // Computing plot bands for the night interval(s)
            // Night start
            if (m.hours() === config.nightStart && m.minutes() <= 30) {
                options.xAxis.plotBands.push({
                    from: m.valueOf(),
                    to: null, // will be stored later
                    color: '#f2f2f2'
                });
            }
            // Night end
            // TODO: ha kimaradás van, akkor ez nem teljesül, a moments összehasonlítás jobb lenne
            if (options.xAxis.plotBands.length > 0
                && m.hours() === config.nightEnd && m.minutes() <= 30) {
                options.xAxis.plotBands[options.xAxis.plotBands.length-1].to = m.valueOf();
            }
        });

        // End the plotband if currently it's night
        var last = options.xAxis.plotBands.length - 1;
        if(options.xAxis.plotBands[last] != null &&
           options.xAxis.plotBands[last].to === null) {
            // TODO: tesztelni!
            var lastTimestamp = json.data[json.data.length-1].timestamp;
            options.xAxis.plotBands[last].to = moment.utc(lastTimestamp).local().valueOf();
        }

        // Custom property to compute stats from this data set
        options.doStats = true;

        options.series[0].lineWidth = 2;

        config.loadedCharts.push(APICall);
        $(DOMtarget).highcharts(options);
    });
}

function loadDoubleChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            displayError(json.error, DOMtarget);
            return;
        }

        if(json.first.data.length === 0 || json.second.data.length === 0) {
            displayError('No data to display.', DOMtarget);
            return;
        }

        // Make sure yesterday's data starts at 00:00
        if(moment.utc(json.second.data[0].timestamp).hours() !== 0) {
            displayError('Not enough data for yesterday. A full day\'s data is required for comparison.', DOMtarget);
            $(document).trigger('chartComplete');
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);
        var date;
        if (json.second.type === "yesterday") {
            date = "yesterday";
        } else if (json.second.type === "week") {
            date = " 7 days ago";
        } else if (json.second.type === "month") {
            date = " 1 month ago";
        } else if (json.second.type === "6month") {
            date = " 6 months ago";
        } else if (json.second.type === "year") {
            date = " 1 year ago";
        }

        // Add more series
        options.series.push({
            name: 'Temperature ' + date,
            yAxis: 0,
            data: [],
            lineWidth: 2,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '°C'
            },
            color: '#F18324',
            zones: [{
                value: config.zones.low,
                color: '#F1AE24'
            },
            {
                value: config.zones.med,
                color: '#F18324'
            },
            {
                value: config.zones.high,
                color: '#F2552E'
            }],
            dashStyle: 'shortdot'
        });

        options.series.push({
            name: 'Humidity ' + date,
            yAxis: 1,
            data: [],
            lineWidth: 2,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%'
            },
            color: '#7C8FBF',
            dashStyle: 'shortdot'
        });

	options.series.push({
            name: 'Pressure ' + date,
            yAxis: 2,
            data: [],
            lineWidth: 2,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: 'hPa'
            },
            color: '#55d0a1',
            dashStyle: 'shortdot'
        });

        // Today
        $.each(json.first.data, function(index, el) {
            // We are cheating here a little to have a nice graph:
            // 1.) Subtracting 1 day:
            // This way the two series can overlap, and the hover bubble can compare two values at a given position.
            // The timestamps are formatted to show only times, not dates.
            //
            // 2.) Rounding to minutes:
            // because otherwise Highcharts would display a separate bubble entry
            // for today's and yesterday's value, but (in theory) these were measured at the same time during of the day
            // (running sensor_scripts/logger.py can be a few seconds off)
            var m; 
            if (json.second.type === "yesterday") {
                m = moment.utc(el.timestamp).local().subtract(1, 'days').seconds(0);
            } else if (json.second.type === "week") {
                m = moment.utc(el.timestamp).local().subtract(7, 'days').seconds(0);
            } else if (json.second.type === "month") {
                m = moment.utc(el.timestamp).local().subtract(30, 'days').seconds(0);
            } else if (json.second.type === "6month") {
                m = moment.utc(el.timestamp).local().subtract(180, 'days').seconds(0);
            } else if (json.second.type === "year") {
                m = moment.utc(el.timestamp).local().subtract(365, 'days').seconds(0);
            }            

            options.series[0].data.push([
                m.valueOf(),
                format(el.temperature)
            ]);
            options.series[1].data.push([
                m.valueOf(),
                el.humidity
            ]);
            options.series[2].data.push([
                m.valueOf(),
                format(el.pressure)
            ]);
        });

        // Yesterday
        $.each(json.second.data, function(index, el) {
            // The same rounding as above with today's data
            var m = moment.utc(el.timestamp).local().seconds(0);
            options.series[3].data.push([
                m.valueOf(),
                format(el.temperature)
            ]);
            options.series[4].data.push([
                m.valueOf(),
                el.humidity
            ]);
            options.series[5].data.push([
                m.valueOf(),
                format(el.pressure)
            ]);
        });

        options.series[1].dashStyle = 'solid';
        options.tooltip.xDateFormat = '%H:%M';
        options.xAxis.labels = {
            format: '{value: %H:%M}'
        };

        // Adding a red vertical marker at the last measurement
        // The same subtraction as above
        var lastTimestamp = moment.utc(json.first.data[json.first.data.length-1].timestamp).local().subtract(1, 'days');
        options.xAxis.plotLines = [{
            value: lastTimestamp.valueOf(),
            color: 'red',
            width: 1
        }];

        config.loadedCharts.push(APICall);
        $(DOMtarget).highcharts(options);
    });
}

function loadCurrentData() {
    $.getJSON('/api/current', function(json) {
        if(!json.success) {
            displayError(json.error, '#error-container');
            return;
        }

        $('#curr-temp').text(format(json.temperature) + '°');
        $('#curr-hum').text(json.humidity + '%');
	    $('#curr-press').text(json.pressure + ' hPa');
    });
}

function loadLastData() {
    $.getJSON('/api/last', function(json) {
        if(!json.success) {
            displayError(json.error, '#error-container');
            return;
        }

        $('#curr-temp-inside').text(format(json.temperature) + '°');
        $('#curr-hum-inside').text(json.humidity + '%');
	$('#curr-press-inside').text(json.pressure + ' hPa');
    });
}

function chartComplete() {
    // Fired at Highchars' load event
    // 'this' points to the Highcharts object
    
    if(config.loadedCharts.length === config.numOfCharts) {
        // Delay the current weather request until the others (charts) have completed,
        // because it takes a long time and slows down poor little Pi :(
        loadCurrentData(); 
        loadLastData();
	loadOutsideWeather();
    }

    if(this.options.doStats) {
        // Ironically, at the time of the load event, the chart's data is not yet available....
        window.setTimeout(computeStats, 100);
        window.setTimeout(computeStatsInside, 200);
    }
}

function displayError(error, target, level) {
    // Values: success (green), info (blue), warning (yellow), danger (red)
    level = level || 'danger';
    $(target).append('<div class="alert alert-' + level + '">' + error + '</div>');
}

function format(number) {
    if(config.unit === 'fahrenheit') {
        // Rounding to 1 decimal place at the same time
        return Math.round((number * (9 / 5) + 32) * 10) / 10;
    } else {
        // Celsius is THE unit, everythings is stored in it!
        return number;
    }
}

function getLocation() {
    if(config.useGeoLocation) {
        if('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                config.latitude = position.coords.latitude;
                config.longitude = position.coords.longitude;
                $(document).trigger('geolocation');
            }, function() {
                if(config.useGeoLocation) {
                    // Only display if it's configured to use geolocation,
                    // not manual coordinates.
                    displayError('Failed to get location. Using predefined coordinates instead.', '#error-container', 'warning');
                }
                $(document).trigger('geolocation');
            });
        } else {
            displayError('No GeoLocation support :( Using predefined coordinates instead.', '#error-container', 'warning');
            $(document).trigger('geolocation');
        }
    }
}

function loadOutsideWeather() {
    if(!config.APIKey) {
        displayError('No Dark Sky API key, unable to get outside weather data.', '#error-container');
        return;
    }

    $.getJSON('https://api.darksky.net/forecast/' +
        config.APIKey + '/' +
        config.latitude + ',' +
        config.longitude +
        '/?units=si&lang='+config.lang+'&exclude=minutely,daily,alerts,flags&callback=?',
        function(json) {            
            $('#curr-temp-outside').text(format(json.currently.temperature.toFixed(1)) + '°');
            $('#curr-hum-outside').text((json.currently.humidity*100).toFixed() + '%');
            $('#curr-press-outside').text(format(json.currently.pressure.toFixed(1)) + ' hPa');	    
	    $('#prec-prob-outside').text(format(100*json.currently.precipProbability.toFixed(1)) + '%');
            $('#prec-int-outside').text(format(json.currently.precipIntensity.toFixed(1)) + ' mm/h');    
	    var precType = json.currently.precipType;
            if (precType != undefined) {
                precType = precType.charAt(0).toUpperCase() + precType.slice(1);
	        $('#prec-type-outside').text(format(precType));		
            }
            
            $('#forecast-summary').text(json.hourly.summary);
            $('#forecast-link').attr('href', 'http://darksky.net/#/f/' +
                config.latitude + ',' + config.longitude);
        });
}

function computeStats() {
    var $stats = $('#stats');
    $stats.empty();

    var day, interval;
    if ($('#chart-today-vs').highcharts() != undefined) {
        day = $('#chart-today-vs').highcharts().series;
    }
    if ($('#chart-past').highcharts() != undefined) {
        interval = $('#chart-past').highcharts().series;
    }
    var intervalType = $('#dropdown-label-past').data('intervalType');
    
    if (day != undefined) {
        // Today:
        stats.today.temperature.min = day[0].dataMin;
        stats.today.temperature.max = day[0].dataMax;
        stats.today.humidity.min = day[1].dataMin;
        stats.today.humidity.max = day[1].dataMax;
        stats.today.pressure.min = day[2].dataMin;
        stats.today.pressure.max = day[2].dataMax;
        stats.today.temperature.avg = 0;
        stats.today.humidity.avg = 0;
        stats.today.pressure.avg = 0;

        for(var i = 0; i < day[0].data.length; i++) {
            stats.today.temperature.avg += parseInt(day[0].data[i].y);
            stats.today.humidity.avg += parseInt(day[1].data[i].y);
            stats.today.pressure.avg += parseInt(day[2].data[i].y);
        }
        stats.today.temperature.avg = (stats.today.temperature.avg / day[0].data.length).toFixed(1);
        stats.today.humidity.avg = (stats.today.humidity.avg / day[1].data.length).toFixed(1);
        stats.today.pressure.avg = (stats.today.pressure.avg / day[2].data.length).toFixed(1);

        // Last [selected] interval:
        stats.interval.temperature.min = interval[0].dataMin;
        stats.interval.temperature.max = interval[0].dataMax;
        stats.interval.humidity.min = interval[1].dataMin;
        stats.interval.humidity.max = interval[1].dataMax;
        stats.interval.pressure.min = interval[2].dataMin;
        stats.interval.pressure.max = interval[2].dataMax;
        stats.interval.temperature.avg = 0;
        stats.interval.humidity.avg = 0;
        stats.interval.pressure.avg = 0;

        for(var i = 0; i < interval[0].data.length; i++) {
            stats.interval.temperature.avg += parseInt(interval[0].data[i].y);
            stats.interval.humidity.avg += parseInt(interval[1].data[i].y);
            stats.interval.pressure.avg += parseInt(interval[2].data[i].y);
        }
        stats.interval.temperature.avg = (stats.interval.temperature.avg / interval[0].data.length).toFixed(1);
        stats.interval.humidity.avg = (stats.interval.humidity.avg / interval[1].data.length).toFixed(1);
        stats.interval.pressure.avg = (stats.interval.pressure.avg / interval[2].data.length).toFixed(1);

        var up = '<span class="up-arrow" title="Compared to the selected interval\'s average">&#9650</span>';
        var down = '<span class="down-arrow" title="Compared to the selected interval\'s average">&#9660</span>';
        var todayTempArrow = (stats.today.temperature.avg > stats.interval.temperature.avg) ? up : down;
        var todayHumArrow = (stats.today.humidity.avg > stats.interval.humidity.avg) ? up : down;
        var todayPressArrow = (stats.today.pressure.avg > stats.interval.pressure.avg) ? up : down;


        $stats.append('<tr><th>Temperature</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayTempArrow + stats.today.temperature.avg + '°</td><td>' + stats.interval.temperature.avg + '°</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.temperature.min + '°</td><td>' + stats.interval.temperature.min + '°</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.temperature.max + '°</td><td>' + stats.interval.temperature.max + '°</td></tr>');
        $stats.append('<tr><th>Humidity</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayHumArrow + stats.today.humidity.avg + '%</td><td>' + stats.interval.humidity.avg + '%</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.humidity.min + '%</td><td>' + stats.interval.humidity.min + '%</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.humidity.max + '%</td><td>' + stats.interval.humidity.max + '%</td></tr>');
        $stats.append('<tr><th>Pressure</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayPressArrow + stats.today.pressure.avg + ' hPa</td><td>' + stats.interval.pressure.avg + ' hPa</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.pressure.min + ' hPa</td><td>' + stats.interval.pressure.min + ' hPa</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.pressure.max + ' hPa</td><td>' + stats.interval.pressure.max + ' hPa</td></tr>');
    } else {
        //if no stats are available, load other info
        loadCurrentData();
        loadLastData();
        loadOutsideWeather();
    }
}

function computeStatsInside() {
    var $stats = $('#stats-inside');
    $stats.empty();

    var day, interval;
    if ($('#chart-today-vs-inside').highcharts() != undefined) {
        day = $('#chart-today-vs-inside').highcharts().series;
    }
    if ($('#chart-past').highcharts() != undefined) {
        interval = $('#chart-past-inside').highcharts().series;
    }
    var intervalType = $('#dropdown-label-past-inside').data('intervalType');
    
    if (day != undefined) {
        // Today:
        stats.today.temperature.min = day[0].dataMin;
        stats.today.temperature.max = day[0].dataMax;
        stats.today.humidity.min = day[1].dataMin;
        stats.today.humidity.max = day[1].dataMax;
        stats.today.pressure.min = day[2].dataMin;
        stats.today.pressure.max = day[2].dataMax;
        stats.today.temperature.avg = 0;
        stats.today.humidity.avg = 0;
        stats.today.pressure.avg = 0;

        for(var i = 0; i < day[0].data.length; i++) {
            stats.today.temperature.avg += parseInt(day[0].data[i].y);
            stats.today.humidity.avg += parseInt(day[1].data[i].y);
            stats.today.pressure.avg += parseInt(day[2].data[i].y);
        }
        stats.today.temperature.avg = (stats.today.temperature.avg / day[0].data.length).toFixed(1);
        stats.today.humidity.avg = (stats.today.humidity.avg / day[1].data.length).toFixed(1);
        stats.today.pressure.avg = (stats.today.pressure.avg / day[2].data.length).toFixed(1);

        // Last [selected] interval:
        stats.interval.temperature.min = interval[0].dataMin;
        stats.interval.temperature.max = interval[0].dataMax;
        stats.interval.humidity.min = interval[1].dataMin;
        stats.interval.humidity.max = interval[1].dataMax;
        stats.interval.pressure.min = interval[2].dataMin;
        stats.interval.pressure.max = interval[2].dataMax;
        stats.interval.temperature.avg = 0;
        stats.interval.humidity.avg = 0;
        stats.interval.pressure.avg = 0;

        for(var i = 0; i < interval[0].data.length; i++) {
            stats.interval.temperature.avg += parseInt(interval[0].data[i].y);
            stats.interval.humidity.avg += parseInt(interval[1].data[i].y);
            stats.interval.pressure.avg += parseInt(interval[2].data[i].y);
        }
        stats.interval.temperature.avg = (stats.interval.temperature.avg / interval[0].data.length).toFixed(1);
        stats.interval.humidity.avg = (stats.interval.humidity.avg / interval[1].data.length).toFixed(1);
        stats.interval.pressure.avg = (stats.interval.pressure.avg / interval[2].data.length).toFixed(1);

        var up = '<span class="up-arrow" title="Compared to the selected interval\'s average">&#9650</span>';
        var down = '<span class="down-arrow" title="Compared to the selected interval\'s average">&#9660</span>';
        var todayTempArrow = (stats.today.temperature.avg > stats.interval.temperature.avg) ? up : down;
        var todayHumArrow = (stats.today.humidity.avg > stats.interval.humidity.avg) ? up : down;
        var todayPressArrow = (stats.today.pressure.avg > stats.interval.pressure.avg) ? up : down;


        $stats.append('<tr><th>Temperature</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayTempArrow + stats.today.temperature.avg + '°</td><td>' + stats.interval.temperature.avg + '°</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.temperature.min + '°</td><td>' + stats.interval.temperature.min + '°</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.temperature.max + '°</td><td>' + stats.interval.temperature.max + '°</td></tr>');
        $stats.append('<tr><th>Humidity</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayHumArrow + stats.today.humidity.avg + '%</td><td>' + stats.interval.humidity.avg + '%</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.humidity.min + '%</td><td>' + stats.interval.humidity.min + '%</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.humidity.max + '%</td><td>' + stats.interval.humidity.max + '%</td></tr>');
        $stats.append('<tr><th>Pressure</th><th>today</th><th>' + intervalType + '</th></tr>');
        $stats.append('<tr><th class="sub">avg</th><td>' + todayPressArrow + stats.today.pressure.avg + ' hPa</td><td>' + stats.interval.pressure.avg + ' hPa</td></tr>');
        $stats.append('<tr><th class="sub">min</th><td>' + stats.today.pressure.min + ' hPa</td><td>' + stats.interval.pressure.min + ' hPa</td></tr>');
        $stats.append('<tr><th class="sub">max</th><td>' + stats.today.pressure.max + ' hPa</td><td>' + stats.interval.pressure.max + ' hPa</td></tr>');
    } else {
        //if no stats are available, load other info
        loadCurrentData();
        loadLastData();
        loadOutsideWeather();
    }
}


function autoReload() {
    var time = new Date();
    var adjustedMinutes;
    if(config.measurementInterval > 60) {
        adjustedMinutes = config.measurementInterval % 60;
        // I know, I know, it's not 100% correct, reloads might fire more often than needed,
        // but I try to keep this code simple, and it's not a serious performance issue 
    } else {
        adjustedMinutes = config.measurementInterval;
    }

    if(time.getMinutes() % adjustedMinutes === 0) {
        console.log('It\'s time!!!', time);
        $('#btn-reload-all').trigger('click');
    }
}

$(document).ready(function() {
    // Init
    Highcharts.setOptions({
        global: {
            useUTC: true
        }
    });
    
    $(document).on('geolocation', loadOutsideWeather);

    getLocation();

    loadDoubleChart('/api/compare/today/yesterday', '#chart-today-vs');
    loadDoubleChart('/api/compare/today/yesterday_Indoor', '#chart-today-vs-inside');

    loadChart('/api/past/week', '#chart-past');
    loadChart('/api/past/week_Indoor', '#chart-past-inside');
    // loadCurrentData() is fired by chartComplete()

    $('[data-toggle="tooltip"]').tooltip();

    $('#dropdown-label-past').data('intervalType', 'week');
    $('#dropdown-label-past-inside').data('intervalType', 'week');

    $(document).ajaxError(function() {
        // Display only one instance of a network error, although multiple failing AJAX calls trigger this event
        if ($('.alert').hasClass('network') === false) {
            // Setting a custom class
            displayError('Network error. Check your connection and server.', '#error-container', 'danger network');
        }
    });

    // The reload function is called every minute, but the function handles inside to only reload stuff when
    // there's new data collected (see config.measurementInterval)
    window.setInterval(autoReload, 60 * 1000);

    // Init end
    


    // UI events
    // Today vs: dropdown change interval 
    $('#chart-interval-today-vs').on('click', function(e) {
        e.preventDefault();

        var interval = $(e.target).parent().attr('data-selector');
        loadDoubleChart('/api/compare/today/' + interval, '#chart-today-vs');

    });

    $('#chart-interval-today-vs-inside').on('click', function(e) {
        e.preventDefault();

        var interval = $(e.target).parent().attr('data-selector');
        loadDoubleChart('/api/compare/today/' + interval + '_Indoor', '#chart-today-vs-inside');

    });

    // Past chart: dropdown change interval
    $('#chart-interval-past').on('click', function(e) {
        e.preventDefault();

        var interval = $(e.target).parent().attr('data-interval');
        $('#dropdown-label-past').text(interval).data('intervalType', interval); // Data used in computeStats()
        loadChart('/api/past/' + interval, '#chart-past');

    });

    $('#chart-interval-past-inside').on('click', function(e) {
        e.preventDefault();

        var interval = $(e.target).parent().attr('data-interval');
        $('#dropdown-label-past-inside').text(interval).data('intervalType', interval); // Data used in computeStatsInside()
        loadChart('/api/past/' + interval + '_Indoor', '#chart-past-inside');

    });    

    $('#btn-reload-outside-sensor').on('click', function() {
        $('#curr-temp, #curr-hum, #curr-press').text('...');
        loadCurrentData();
    });

    $('#btn-reload-inside').on('click', function() {
        $('#curr-temp-inside, #curr-hum-inside, #curr-press-inside').text('...');
        loadLastData();
    });

    $('#btn-reload-outside').on('click', function() {
        $('#curr-temp-outside, #curr-hum-outside, #curr-press-outside, #prec-prob-outside, #prec-int-outside, #prec-type-outside').text('...');
        loadOutsideWeather();
    });

    $('#btn-reload-all').on('click', function() {
        $('#error-container').empty();
        $('#curr-temp-outside, #curr-hum-outside, #curr-press-outside, #prec-prob-outside, #prec-int-outside, #prec-type-outside, #curr-temp-inside, #curr-hum-inside, #curr-press-inside, #curr-temp, #curr-hum, #curr-press, #forecast-summary').text('...');
        $('#chart-today-vs, #chart-past, #chart-today-vs-inside, #chart-past-inside').each(function(i, el) {
            if ($(el).highcharts()) {
                // It might be uninitialized due to a previous error (eg. network error)
                $(el).highcharts().destroy();
            }
        });
        config.loadedCharts = [ ];

        loadOutsideWeather();
        loadDoubleChart('/api/compare/today/yesterday', '#chart-today-vs');
        loadChart('/api/past/week', '#chart-past');
        loadDoubleChart('/api/compare/today/yesterday_Indoor', '#chart-today-vs-inside');
        loadChart('/api/past/week_Indoor', '#chart-past-inside');        
        // loadCurrentData() is fired by chartComplete()
    });
});
