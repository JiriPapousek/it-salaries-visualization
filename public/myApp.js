
var width;
var height;

var data;
var countries;

var selectedCountries;
var selectedProfession;
var selectedAge;

var selectedDataPerCountry;

var colorScaleSequential;

d3.csv("./public/data.csv")
  .row(function (d) {
    return {
        age: d['Age'],
        country: d['Country'],
        profession: d['DevType'],
        salary: Number(d['CompTotal'])
    };
  }).get(function (error, rows) {
    data = rows;
    init();
  });

function init() {
    width = window.innerWidth;
    height = window.innerHeight;

    selectedCountries = new Set();

    countries = new Set();
    data.forEach(d => countries.add(d.country));

    populateFilterOptions(data);
    updateSelectedDataPerCountry();
    initColorScale();

    drawMap();
    drawViolinPlot();
    drawLegend();
    d3.select(window).on('resize', redraw); 
};

function redrawLegend() {
  d3.select('#legend_div').select("svg").remove();

  drawLegend();
}

function drawLegend() {
  legend({
    color: colorScaleSequential,
    title: "Average monthly income (EUR)",
    width: width*0.63,
    ticks: 10,
    height: 55
  })
}

function populateFilterOptions(data) {
  d3.select("#age_filter_div")
  .append("text")
  .text("Age: ");

  let ageOptions =  [...new Set(data.map((d) => d.age))];
  var index = ageOptions.indexOf("");
  if (index !== -1) {
    ageOptions.splice(index, 1);
  }
  ageOptions.sort();
  ageOptions = ["All"].concat(ageOptions);


  d3.select("#age_filter_div")
    .append("select")
    .attr('class','select')
    .attr("id", "age_select")
    .selectAll('option') 
    .data(ageOptions)
    .enter()
    .append("option")
    .attr("value", function (d) {
      return d;
    })
    .text(function (d) {
      return d;
    });

  d3.select("#age_select")
    .property("value", "All")
    .on("change", function() {
      selectedAge = this.value;
      updateSelectedDataPerCountry();
      redrawMap();
      redrawViolinPlot();
    });
  
  selectedAge = "All";

  d3.select("#profession_filter_div")
    .append("text")
    .text("Profession: ");

  let professionOptions = new Set();
  for (let i = 0; i < data.length; i++) {
    professions = data[i].profession.split(';');
    professions.forEach(p => professionOptions.add(p));
  }
  professionOptions = [...professionOptions];
  professionOptions.sort();
  professionOptions = ["All"].concat(professionOptions);

  d3.select("#profession_filter_div")
    .append("select")
    .attr("id", "profession_select")
    .selectAll('option') 
    .data(professionOptions)
    .enter()
    .append("option")
    .attr("value", function (d) {
      return d;
    })
    .text(function (d) {
      return d;
    });

  d3.select("#profession_select")
    .property("value", "All")
    .on("change", function() {
      selectedProfession = this.value;
      updateSelectedDataPerCountry();
      redrawMap();
      redrawViolinPlot();
    });

  selectedProfession = "All";
};

function updateSelectedDataPerCountry() {
  selectedDataPerCountry = new Object();
  countries.forEach(d => selectedDataPerCountry[d] = []);
  for (let i = 0; i < data.length; i++) {
    if (selectedProfession == "All" || selectedProfession == data[i].profession) {
      if (selectedAge == "All" || selectedAge == data[i].age) {
        selectedDataPerCountry[data[i].country].push(data[i].salary);
      }
    }
  }

  selectedCountries.forEach(function(countryName) {
    if (selectedDataPerCountry[countryName] == undefined || selectedDataPerCountry[countryName].length == 0) {
      selectedCountries.delete(countryName);
    }
  });
};

function redrawMap() {
  d3.select('#map_div').select('svg').remove();
  
  width = window.innerWidth;
  height = window.innerHeight;

  drawMap();
};

function drawMap() {
  d3.select('#map_div')
    .append('svg')
    .attr("width", "100%")
    .attr("height", "100%");

  // The svg
  var svg = d3.select("svg");

  // Load external data and boot
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson", function(data){

    var projection = d3.geoNaturalEarth1()
      .fitSize([width * 0.65, height * 0.7], data);

    // Draw the map
    svg.append("g")
       .selectAll("path")
       .data(data.features)
       .enter().append("path")
            .attr("fill", function(d) {
              return getCountryColor(d.properties.name);
            })
            .attr("d", d3.geoPath()
                .projection(projection)
            )
            .attr("country", function(d, i) {
              return d.properties.name;
            })
            .style("stroke", "#fff")
            .on("click", function () { 
              let countryName = d3.select(this).attr("country");
              if (selectedDataPerCountry[countryName] != undefined && selectedDataPerCountry[countryName].length != 0) {
                if (selectedCountries.has(countryName)) {
                  selectedCountries.delete(countryName);
                } else {
                  selectedCountries.add(countryName);
                }
                d3.select(this).attr("fill", getCountryColor(countryName))
                redrawViolinPlot();
              }
            });
  });
};

function initColorScale() {

  minValue = Number.MAX_VALUE
  maxValue = Number.MIN_VALUE
  let maxCountry, minCountry;
  Object.entries(selectedDataPerCountry).forEach(([k,v]) => {
    let avg = v.reduce((a, b) => a + b, 0) / v.length;
    if (avg < minValue) {
      minValue = avg;
      minCountry = k;
    }
    if (avg > maxValue) {
      maxValue = avg;
      maxCountry = k;
    }
  });

  colorScaleSequential = d3.scaleSequential().domain([minValue, maxValue]).interpolator(d3.interpolateYlGnBu);
}

function getCountryColor(countryName) {
  if (selectedDataPerCountry[countryName] == undefined || selectedDataPerCountry[countryName].length == 0) {
    return "grey";
  } else if (selectedCountries.has(countryName)) {
    return "red";
  } else {
    let avg = selectedDataPerCountry[countryName].reduce((a, b) => a + b, 0) / selectedDataPerCountry[countryName].length;

    return colorScaleSequential(avg);
  }
};

function redrawViolinPlot() {
  d3.select('#violinplot_div').select("svg").remove();

  drawViolinPlot();
}

// Taken and modified from https://d3-graph-gallery.com/graph/violin_basicHist.html
function drawViolinPlot() {

  svg = d3.select('#violinplot_div')
    .append("svg")
    .style("overflow", "visible")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform",
          "translate(" + 50 + "," + 20 + ")");

  // Build and Show the Y scale
  var x = d3.scaleLinear()
    .domain([0, 20000]) // Note that here the Y scale is set manually
    .range([0, width * 0.33 - 50])
  svg.append("g")
    .attr("transform", "translate(0,0)")
    .call(d3.axisTop(x))


  // Build and Show the X scale. It is a band scale like for a boxplot: each group has an dedicated RANGE on the axis. This range has a length of x.bandwidth
  var y = d3.scaleBand()
    .range([height * 0.70, 0])
    .domain([...selectedCountries])
    .padding(0.2) // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
  svg.append("g").call(d3.axisLeft(y))

  // Features of the histogram
  var histogram = d3.histogram()
  .domain(x.domain())
  .thresholds(x.ticks(20))    // Important: how many bins approx are going to be made? It is the 'resolution' of the violin plot
  .value(d => d)

  // Compute the binning for each group of the dataset
  var filteredData = Object.keys(selectedDataPerCountry)
    .filter(key => selectedCountries.has(key))
    .reduce((obj, key) => {
        obj[key] = selectedDataPerCountry[key];
        return obj;
    }, {});


  var sumstat = new Object();
  Object.entries(filteredData).forEach(([k, v]) => sumstat[k] = histogram(v));
  sumstat = Object.entries(sumstat);


  // What is the biggest number of value in a bin? We need it cause this value will have a width of 100% of the bandwidth.
  var maxNum = 0
  for ( i in sumstat ){
    allBins = sumstat[i][1]
    lengths = allBins.map(function(a){return a.length;})
    longuest = d3.max(lengths)
    if (longuest > maxNum) { maxNum = longuest }
  }

  // The maximum width of a violin must be x.bandwidth = the width dedicated to a group
  var yNum = d3.scaleLinear()
    .range([0, y.bandwidth()])
    .domain([-maxNum,maxNum])

  // Add the shape to this svg!
  svg
  .selectAll("myViolin")
  .data(sumstat)
  .enter()        // So now we are working group per group
  .append("g")
    .attr("transform", function([key, _]){ return("translate(0," + y(key) +")") } ) // Translation on the right to be at the group position
  .append("path")
      .datum(function([key,value]){ return(value)})     // So now we are working bin per bin
      .style("stroke", "none")
      .style("fill","red")
      .attr("d", d3.area()
          .x(function(d){ return(x(d.x0)) } )
          .y0(function(d){ return(yNum(-d.length)) } )
          .y1(function(d){ return(yNum(d.length)) } )
          .curve(d3.curveCatmullRom)    // This makes the line smoother to give the violin appearance. Try d3.curveStep to see the difference
      )

};

function redraw() {
  redrawMap();
  redrawViolinPlot();
  redrawLegend();
}

// Code for color legend is taken from https://observablehq.com/@d3/color-legend
function legend({
  color,
  title,
  tickSize = 6,
  width = 320,
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues
} = {}) {
  svg = d3.select("#legend_div")
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .style("overflow", "visible");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
      .interpolator(d3.interpolateRound(marginLeft, width - marginRight)), {
        range() {
          return [marginLeft, width - marginRight];
        }
      });

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds ? color.thresholds() // scaleQuantize
      :
      color.quantiles ? color.quantiles() // scaleQuantile
      :
      color.domain(); // scaleThreshold

    const thresholdFormat = tickFormat === undefined ? d => d :
      typeof tickFormat === "string" ? d3.format(tickFormat) :
      tickFormat;

    x = d3.scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
      .attr("x", (d, i) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d, i) => x(i) - x(i - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", d => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = i => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3.scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", color);

    tickAdjust = () => {};
  }

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x)
      .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
      .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
      .tickSize(tickSize)
      .tickValues(tickValues))
    .call(tickAdjust)
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
      .attr("x", marginLeft)
      .attr("y", marginTop + marginBottom - height - 6)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(title));

  return svg.node();
}

function ramp(color, n = 256) {
  var canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(i, 0, 1, 1);
  }
  return canvas;
}