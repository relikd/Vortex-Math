let loop_colors = [
	'#7f0000', '#006400', '#708090', '#808000', '#483d8b', '#3cb371',
	'#00008b', '#32cd32', '#7f007f', '#b03060', '#ff4500', '#00ced1',
	'#ffa500', '#00ff00', '#00fa9a', '#8a2be2', '#dc143c', '#00bfff',
	'#f4a460', '#0000ff', '#f08080', '#adff2f', '#ff00ff', '#1e90ff',
	'#f0e68c', '#ffff54', '#ff1493', '#7b68ee', '#ee82ee', '#dcdcdc'
];
let length_colors = ['#3293e2', '#3ad46b', '#facb2a', '#ff8132', '#843a53'];

window.onload = function(e) { 
	change_color_mode();
	draw();
}

function reset() {
	document.getElementById('select').innerHTML = '';
	document.getElementById('arrows').innerHTML = '';
	let lw = document.getElementById('linewidth').value;
	let hover = document.getElementById('hover').checked;
	let msg = document.getElementById('message');
	let main = document.getElementById('loops');
	let arrow = document.getElementById('arrows');
	let parent = document.getElementById('img');
	msg.title = '';
	msg.innerHTML = '';
	main.innerHTML = '';
	main.setAttribute('stroke-width', lw + 'px');
	if (hover) {
		parent.classList.add('hover');
		parent.style.cursor = 'crosshair';
		arrow.setAttribute('onclick', 'loop_hover_click(this)');
		main.setAttribute('onclick', 'loop_hover_click(this)');
	} else {
		parent.classList.remove('hover');
		parent.removeAttribute('style');
		arrow.removeAttribute('onclick');
		main.removeAttribute('onclick');
	}
}

function draw(changes_graph=false) {
	let sel = document.getElementById('select')
	let prev_sel = sel.value;
	reset();

	let colorMode = document.getElementById('color').value;
	let mul = document.getElementById('multiply').value;
	let mod = document.getElementById('modulo').value;
	// draw background circle and numbers / marks
	let radius = 440;
	let center = radius + 60;
	let circle_points = get_circle_points(center, radius, mod);
	draw_background(center, radius, circle_points);
	// calculate loop groups
	let loops = get_loops(mul, mod);
	// (optionally) draw arrow heads
	if (document.getElementById('arrow').checked) {
		let lw = document.getElementById('linewidth').value;
		draw_arrows(loops, circle_points, lw);
	}
	// draw either individual lines or chained loop
	if (colorMode == 'segment') {
		draw_lines_separate(loops, circle_points);
	} else {
		draw_lines_group(loops, circle_points);
	}
	set_selection_options();
	// apply coloring
	if (colorMode == 'loop') {
		set_colors_loop();
	} else if (colorMode == 'length') {
		set_colors_loop_length(mod);
	} else if (colorMode == 'segment') {
		set_colors_line_length(circle_points);
	} else if (colorMode == 'select') {
		if (prev_sel && !changes_graph) {
			sel.value = prev_sel;
		}
		update_highlight();
	}
}

// -----------------
// Main loop drawing
// -----------------

function get_circle_points(cp, radius, divisor) {
	var points = [];
	let piece = 2 * Math.PI / divisor;
	for (var i = 0; i < divisor; i++) {
		let x = radius * Math.cos(i * piece - Math.PI / 2);
		let y = radius * Math.sin(i * piece - Math.PI / 2);
		points.push([cp + x, cp + y]);
	}
	return points;
}

function get_loops(multiplier, modulo) {
	var all_loops = [];
	var visited = [0];
	for (var i = 1; i < modulo; i++) {
		if (visited.includes(i)) continue;
		visited.push(i);
		var one_loop = [i];
		var u = i;
		while (true) {
			u = (u * multiplier) % modulo;
			one_loop.push(u);
			if (visited.includes(u)) break;
			visited.push(u);
		}
		all_loops.push(one_loop);
	}
	return all_loops;
}

function draw_background(cp, radius, points) {
	let fs = document.getElementById('fontsize').value;
	// show every n-th text
	let max_chr_count = 1 + Math.floor(Math.log10(points.length - 1));
	let label_dist = dist(points[0], points[1]);
	let label_mod = Math.floor(fs / 2 * max_chr_count / label_dist) + 1;
	// draw circle
	var src_txt = '';
	var src_bg = `\n<circle cx="${cp}" cy="${cp}" r="${radius}"/>`;
	for (var i = 0; i < points.length; i++) {
		let x = points[i][0] - cp;
		let y = points[i][1] - cp;
		if (fs > 0 && i % label_mod == 0) {
			let chr_count = i < 1 ? 1 : 1 + Math.floor(Math.log10(i));
			let mi = 1.01;  // inner line startpoint multiply
			let mo = 1.05;  // outer line endpoint multiply
			src_bg += `\n<line x1="${f3(cp + x*mi)}" y1="${f3(cp + y*mi)}" x2="${f3(cp + x*mo)}" y2="${f3(cp + y*mo)}"/>`;  // or <path d="Mx1,y1Lx2,y2Z"/>
			// additional font offset
			let ls_fix = .15 * 2 * (chr_count-1);  // letter spacing fix
			let fsdx = chr_count * fs / (3.35 + ls_fix) * (1-x/radius*1.2);
			let fsdy = fs / 3.35 * (1+y/radius*1.5);
			src_txt += `\n<text x="${f3(cp + x*mo - fsdx)}" y="${f3(cp + y*mo + fsdy)}">${i}</text>`;
		}
	}
	let bgtxt = document.getElementById('bgtxt');
	bgtxt.setAttribute('font-size', fs + 'px');
	document.getElementById('bg').innerHTML = src_bg + '\n';
	bgtxt.innerHTML = src_txt + '\n';
}

function draw_arrows(loops, points, linewidth) {
	var txt = '';
	for (var o = 0; o < loops.length; o++) {
		let loop = loops[o];
		txt += '\n<path d="';
		for (var i = 1; i < loop.length; i++) {
			txt += arrow_path(points[loop[i - 1]], points[loop[i]], linewidth);
		}
		txt += '"/>';
	}
	document.getElementById('arrows').innerHTML = txt + '\n';
}

function draw_lines_group(loops, points) {
	var txt = '';
	for (var o = 0; o < loops.length; o++) {
		let loop = loops[o];
		txt += '\n<path d="M' + P(points[loop[0]][0], points[loop[0]][1]);
		for (var i = 1; i < loop.length; i++) {
			let pt = points[loop[i]];
			txt += 'L' + P(pt[0], pt[1]);
		}
		txt += `" data-loop="${loop.join(',')}"/>`;
	}
	document.getElementById('loops').innerHTML = txt + '\n';
}

// -------------------
// Color by loop group
// -------------------

function set_colors_loop() {
	let children = document.getElementById('loops').children;
	// colors
	for (var i = 0; i < children.length; i++) {
		children[i].setAttribute('stroke', loop_colors[i % loop_colors.length]);
	}
	// info message
	document.getElementById('message').innerHTML = children.length + ' loops';
}

// --------------------
// Color by loop length
// --------------------

function set_colors_loop_length(total) {
	let split = 5 * (1 + Math.floor(Math.log10(total)));
	// colors
	let children = document.getElementById('loops').children;
	for (var i = 0; i < children.length; i++) {
		let count = children[i].getAttribute('data-loop').split(',').length;
		let idx = Math.min(Math.floor(count / total * split), length_colors.length - 1);
		children[i].setAttribute('stroke', length_colors[idx]);
	}
	// info message
	var info = '';
	for (var i = 0; i < length_colors.length; i++) {
		let lower = Math.ceil(i * total / split);
		let upper;
		if (i + 1 == length_colors.length) { upper = total; }
		else { upper = Math.floor(((i + 1) * total - 1) / split); }
		if (lower > upper || upper < 2) continue;
		info += ' , ' + color_label(i, lower + ' – ' + upper);
	}
	document.getElementById('message').innerHTML = info.slice(3);
}

// --------------------
// Color by line length
// --------------------

function draw_lines_separate(loops, points) {
	var txt = '';
	for (var o = 0; o < loops.length; o++) {
		let loop = loops[o];
		txt += '\n<g data-loop="' + loop.join(',') + '">';
		for (var i = 1; i < loop.length; i++) {
			let p1 = points[loop[i - 1]];
			let p2 = points[loop[i]];
			txt += '\n<path data-len="' + Math.floor(dist(p1, p2)) + '" d="M' + P(p1[0], p1[1]) + 'L' + P(p2[0], p2[1]) + '"/>';
		}
		txt += '\n</g>';
	}
	document.getElementById('loops').innerHTML = txt + '\n';
}

function set_colors_line_length(points) {
	let min = dist(points[0], points[1]);
	let max = Math.max(1, dist(points[0], points[Math.floor(points.length/2)]) - min);
	var counter = [];
	var count_dots = 1; // 0 * x is always a point
	// colors
	let children = document.querySelectorAll('#loops path');
	for (var i = 0; i < children.length; i++) {
		let len = children[i].getAttribute('data-len') ;
		if (len == 0) {
			++count_dots;
			continue;
		}
		let percent = (len - min) / max; // OR len / (2 * radius);
		let idx = Math.round((1 - percent) * (length_colors.length - 1));
		children[i].setAttribute('stroke', length_colors[idx]);
		counter[idx] = (counter[idx] || 0) + 1;
	}
	// info message
	var info = '';
	for (var i = 0; i < length_colors.length; i++) {
		info += ' , ' + color_label(i, (counter[i] || 0) + ' lines');
	}
	info += ' , [' + count_dots + ' points]';
	document.getElementById('message').innerHTML = info.slice(3);
}

// -----------------------------------
// Color by selection (highlight mode)
// -----------------------------------

function set_selection_options() {
	var txt = '<option value="-1">None</option>';
	let children = document.getElementById('loops').children;
	for (var i = 0; i < children.length; i++) {
		let loop = children[i].getAttribute('data-loop').split(',');
		let abbrev;
		if (loop.length > 10) {
			abbrev = loop.slice(0, 5).join(',') + ` + ${loop.length - 5} more`;
		} else {
			abbrev = loop.join(',');
		}
		txt += `<option value="${i}">${abbrev}</option>`;
	}
	document.getElementById('select').innerHTML = txt;
}

function loop_hover_click(sender) {
	var node = sender.querySelector(':hover');
	var indexOfChild = 0;
	while (node = node.previousSibling) {
		if (node.nodeType === 1) { ++indexOfChild; }
	}
	document.getElementById('select').value = indexOfChild;
	let color = document.getElementById('color');
	if (color.value == 'select') {
		update_highlight();
	} else {
		color.value = 'select';
		change_color_mode();
		draw();
	}
}

function update_highlight() {
	if (document.getElementById('color').value != 'select') {
		return;
	}
	remove_highlight();
	let msg = document.getElementById('message');
	let idx = document.getElementById('select').value;
	let child = document.getElementById('loops').children[idx];
	let arrow = document.getElementById('arrows').children[idx];
	if (!child) { msg.innerHTML = ''; return; }
	child.classList.add('selected');
	if (arrow) arrow.classList.add('selected');
	let txt = child.getAttribute('data-loop');
	msg.innerHTML = txt.length > 52 ? txt.slice(0, 50) + '…' : txt;
	msg.title = txt;
}

function remove_highlight() {
	let selected = document.querySelectorAll('.selected');
	for (var i = selected.length - 1; i >= 0; i--) {
		selected[i].classList.remove('selected');
	}
}

// ---------------------------
// Input interaction callbacks
// ---------------------------

function change_color_mode() {
	let colorMode = document.getElementById('color').value;
	document.getElementById('select').hidden = colorMode != 'select';
}

function svg_download() {
	let mul = document.getElementById('multiply').value;
	let mod = document.getElementById('modulo').value;
	let svg = document.getElementById('img').innerHTML;
	let blob = new Blob([svg], {type:'image/svg+xml'});
	var tmp = document.createElement('a');
	tmp.href = window.URL.createObjectURL(blob);
	tmp.download = `graph_x${mul}_mod${mod}.svg`;
	document.body.appendChild(tmp);
	tmp.click();
	document.body.removeChild(tmp);
}

// --------------
// Helper methods
// --------------

function f3(num) { return Math.floor(num * 10) / 10; }
function P(p1, p2) { return f3(p1) + ',' + f3(p2); }

function color_label(idx, label) {
	return '<strong style="color: ' + length_colors[idx] + '">' + label + '</strong>';
}

function dist(p1, p2) {
	let dx = p1[0] - p2[0];
	let dy = p1[1] - p2[1];
	return Math.sqrt(dx * dx + dy * dy);
}

function arrow_path(p1, p2, linewidth) {
	let arrow_width = linewidth * 2.5;
	let arrow_length = arrow_width * 3;
	let arrow_offset = -arrow_length - 20;
	let diff = dist(p1, p2);
	let xnorm = (p1[0] - p2[0]) / diff;
	let ynorm = (p1[1] - p2[1]) / diff;
	let x1 = p1[0] + arrow_offset * xnorm;
	let y1 = p1[1] + arrow_offset * ynorm;
	let x2 = xnorm * arrow_length - ynorm * arrow_width;
	let y2 = ynorm * arrow_length + xnorm * arrow_width;
	let x3 = +ynorm * 2 * arrow_width;
	let y3 = -xnorm * 2 * arrow_width;
	return 'M' + P(x1, y1) + 'l' + P(x2, y2) + 'l' + P(x3, y3) + 'Z';
}
