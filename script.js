document.addEventListener('DOMContentLoaded', function() {
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 580 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    var svg = d3.select("#treemap_svg")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var svgSankey = d3.select("#sankey_svg").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    let currentCharacter = '';
    
    var color = d3.scaleOrdinal()
        .domain(["Vowels", "Consonants", "Punctuation"])
        .range(["#402d54", "#D18975", "#8FD175"]);

    document.getElementById('submitButton').addEventListener('click', function() {
        svg.selectAll('*').remove();
        svgSankey.selectAll("*").remove();
        document.getElementById('flow_label').textContent = "Character flow for ...";

        const text = document.getElementById('wordbox').value.toLowerCase();

        const vowelCounts = {a: 0, e: 0, i: 0, o: 0, u: 0, y: 0}
        const vowelList = ['a', 'e', 'i', 'o', 'u', 'y']

        const consonantCounts = {b:0, c:0, d:0, f:0, g:0, h:0, j:0, k:0, l:0, m:0, n:0, p:0, q:0, r:0, s:0, t:0, v:0, w:0, x:0, z:0}
        const consonantList = ['b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','z']

        const punctuationCounts = {}
        for(let i=0; i<text.length; i++){
            if(vowelList.includes(text[i])){
                vowelCounts[text[i]] += 1
            }
            if(consonantList.includes(text[i])){
                consonantCounts[text[i]] += 1
            }
            if(text[i] === '.' || text[i] === ',' || text[i] === '!' || text[i] === '?' || text[i] === ':' || text[i] === ';'){
                punctuationCounts[text[i]] = (punctuationCounts[text[i]] || 0) + 1
            }  
        }
        
        const data = {
            name: "Characters",
            children: [
                {
                    name: "Vowels",
                    children: Object.keys(vowelCounts).map(char => ({
                        name: char,
                        size: vowelCounts[char]
                    }))
                },
                {
                    name: "Consonants",
                    children: Object.keys(consonantCounts).map(char => ({
                        name: char,
                        size: consonantCounts[char]
                    }))
                },
                {
                    name: "Punctuation",
                    children: Object.keys(punctuationCounts).map(char => ({
                        name: char,
                        size: punctuationCounts[char]
                    }))
                }
            ]
        };

        var root = d3.hierarchy(data).sum(d => d.size);
        d3.treemap()
            .size([width, height])
            .paddingTop(0)
            .paddingRight(0)
            .paddingInner(3)
            (root);

        svg.selectAll("rect")
            .data(root.leaves())
            .enter()
            .append("rect")
                .attr('x', function (d) { return d.x0; })
                .attr('y', function (d) { return d.y0; })
                .attr('width', function (d) { return d.x1 - d.x0; })
                .attr('height', function (d) { return d.y1 - d.y0; })
                .style("stroke", "black")
                .style("stroke-width", 1)
                .style("fill", function (d) { return color(d.parent.data.name); })
                .on("mouseover", function(event, d) {
                    const tooltip = d3.select("#tooltip");
                    tooltip.style("display", "block")
                        .html(`Character: ${d.data.name}<br>Count: ${d.data.size}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mousemove", function(event) {
                    d3.select("#tooltip")
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    d3.select("#tooltip").style("display", "none");
                })
                .on("click", function(event, d) {
                    currentCharacter = d.data.name;
                    updateSankey(text, currentCharacter);
                });
    });

    function updateSankey(text, selectedChar) {
        svgSankey.selectAll("*").remove();
        document.getElementById('flow_label').textContent = `Character flow for '${selectedChar}'`;

        const beforeChars = {};
        const afterChars = {};
        let count = 0;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i] === selectedChar) {
                count++;
                if (i > 0) {
                    beforeChars[text[i-1]] = (beforeChars[text[i-1]] || 0) + 1;
                }
                if (i < text.length - 1) {
                    afterChars[text[i+1]] = (afterChars[text[i+1]] || 0) + 1;
                }
            }
        }

        var nodes = [];
        var links = [];
        for (let key in beforeChars){
            if(beforeChars.hasOwnProperty(key)){
                nodes.push({node: nodes.length, name: key, category: getCategory(key)});
            }
        }
        
        const selectedCharIndex = nodes.length;
        nodes.push({ node: nodes.length, name: selectedChar, category: getCategory(selectedChar)});

        for (let key in afterChars){
            if(afterChars.hasOwnProperty(key)){
                nodes.push({node: nodes.length+1, name: key, category: getCategory(key)});
            }
        }

        for (let key in beforeChars){
            if(beforeChars.hasOwnProperty(key)){
                let val = beforeChars[key];
                links.push({source: links.length, target: selectedCharIndex, value: val});
            }
        }
        var i = 0
        for (let key in afterChars){
            if(afterChars.hasOwnProperty(key)){
                let val = afterChars[key];
                links.push({source: selectedCharIndex, target: selectedCharIndex + 1 + i, value: val});
                i += 1
            }
        }
        
        const sankeyLayout = d3.sankey()
            .nodeWidth(36)
            .nodePadding(10)
            .size([width, height]);
            

        const {nodes: sankeyNodes, links: sankeyLinks} = sankeyLayout({nodes, links});

        svgSankey.append("g")
            .selectAll(".link")
            .data(sankeyLinks)
            .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke-width", function(d) { return d.width; })
            
        const node = svgSankey.append("g")
            .selectAll(".node")
            .data(sankeyNodes)
            .enter().append("g")
                .attr("class", "node");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.category))
            .attr("stroke", "#000")
            .attr("stroke-width", "1px")
            .on("mouseover", function(event, d) {
                const tooltip = d3.select("#tooltip");
                let coloumn = "";
                if(d.name === selectedChar){
                    coloumn = `Character '${selectedChar}' appears ${count} times.`;
                }
                else if (d.x0 < selectedCharIndex){
                    coloumn = `Character '${d.name}' flows into '${selectedChar}' ${d.value} times.<br>Character '${selectedChar}' appears ${count} times.`
                }
                else{
                    coloumn = `Character '${selectedChar}' flows into '${d.name}' ${d.value} times.<br>Character '${selectedChar}' appears ${count} times.`;
                }
                tooltip.style("display", "block")
                    .html(coloumn)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function(event) {
                d3.select("#tooltip")
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });

        node.append("text")
            .attr("x", d => d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(function(d) { return d.name; })
            .filter(function(d) { return d.x0 < width / 2; })
            .attr("x", function(d) { return d.x1 + 6; })
            .attr("text-anchor", "start");
    }

    function getCategory(char) {
        const vowelList = ['a', 'e', 'i', 'o', 'u', 'y']
        const consonantList = ['b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','z']
        if (vowelList.includes(char)) {
            return "Vowels";
        } else if (consonantList.includes(char)) {
            return "Consonants";
        } else if (char === '.' || char === ',' || char === '!' || char === '?' || char === ':' || char === ';') {
            return "Punctuation";
        }
        return null; 
    }
});
