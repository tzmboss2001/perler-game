/**
 * 拼豆珠子颜色库
 * 数据来源: https://github.com/maxcleme/beadcolors + https://pixel-beads.com (MARD)
 * 总计: 647 种颜色 (Perler 102 + Hama 80 + Artkal 174 + MARD 291)
 */

export interface BeadColor {
  id: string;
  name: string;
  nameCN: string;
  rgb: [number, number, number];
  hex: string;
  brand: 'perler' | 'hama' | 'artkal' | 'mard';
}

// ============ Perler 色板 (美国) - 102色 ============
export const perlerColors: BeadColor[] = [
  { id: '80-15179', name: 'Evergreen', nameCN: '常绿色', rgb: [48, 85, 69], hex: '#305545', brand: 'perler' },
  { id: '80-15181', name: 'Light Grey', nameCN: '浅灰色', rgb: [179, 186, 184], hex: '#b3bab8', brand: 'perler' },
  { id: '80-15182', name: 'Lavender', nameCN: '薰衣草', rgb: [175, 159, 206], hex: '#af9fce', brand: 'perler' },
  { id: '80-15199', name: 'Shamrock', nameCN: '三叶草绿', rgb: [0, 143, 83], hex: '#008f53', brand: 'perler' },
  { id: '80-15200', name: 'Cobalt', nameCN: '钴蓝', rgb: [0, 101, 177], hex: '#0065b1', brand: 'perler' },
  { id: '80-15201', name: 'Midnight', nameCN: '午夜蓝', rgb: [47, 60, 85], hex: '#2f3c55', brand: 'perler' },
  { id: '80-15202', name: 'Robin\'s Egg', nameCN: '知更鸟蛋蓝', rgb: [169, 205, 213], hex: '#a9cdd5', brand: 'perler' },
  { id: '80-15203', name: 'Flamingo', nameCN: '火烈鸟粉', rgb: [242, 175, 183], hex: '#f2afb7', brand: 'perler' },
  { id: '80-15204', name: 'Salmon', nameCN: '鲑鱼粉', rgb: [225, 116, 122], hex: '#e1747a', brand: 'perler' },
  { id: '80-15205', name: 'Fawn', nameCN: '小鹿色', rgb: [201, 163, 133], hex: '#c9a385', brand: 'perler' },
  { id: '80-15206', name: 'Pewter', nameCN: '锡灰色', rgb: [148, 161, 157], hex: '#94a19d', brand: 'perler' },
  { id: '80-15207', name: 'Charcoal', nameCN: '炭灰色', rgb: [79, 89, 90], hex: '#4f595a', brand: 'perler' },
  { id: '80-15208', name: 'Toasted Marshmallow', nameCN: '烤棉花糖', rgb: [222, 218, 206], hex: '#dedace', brand: 'perler' },
  { id: '80-15210', name: 'Orchid', nameCN: '兰花紫', rgb: [177, 98, 142], hex: '#b1628e', brand: 'perler' },
  { id: '80-15211', name: 'Tomato', nameCN: '番茄红', rgb: [209, 67, 55], hex: '#d14337', brand: 'perler' },
  { id: '80-15212', name: 'Spice', nameCN: '香料色', rgb: [217, 89, 58], hex: '#d9593a', brand: 'perler' },
  { id: '80-15213', name: 'Apricot', nameCN: '杏色', rgb: [245, 161, 104], hex: '#f5a168', brand: 'perler' },
  { id: '80-15214', name: 'Sherbet', nameCN: '冰沙绿', rgb: [216, 228, 124], hex: '#d8e47c', brand: 'perler' },
  { id: '80-15215', name: 'Mist', nameCN: '薄雾蓝', rgb: [147, 176, 189], hex: '#93b0bd', brand: 'perler' },
  { id: '80-15216', name: 'Sky', nameCN: '天蓝色', rgb: [74, 192, 216], hex: '#4ac0d8', brand: 'perler' },
  { id: '80-15217', name: 'Lagoon', nameCN: '泻湖蓝', rgb: [0, 164, 172], hex: '#00a4ac', brand: 'perler' },
  { id: '80-15218', name: 'Teal', nameCN: '青色', rgb: [4, 127, 138], hex: '#047f8a', brand: 'perler' },
  { id: '80-15219', name: 'Fern', nameCN: '蕨绿', rgb: [127, 151, 26], hex: '#7f971a', brand: 'perler' },
  { id: '80-15220', name: 'Olive', nameCN: '橄榄绿', rgb: [105, 110, 49], hex: '#696e31', brand: 'perler' },
  { id: '80-15961', name: 'Cherry', nameCN: '樱桃红', rgb: [157, 43, 58], hex: '#9d2b3a', brand: 'perler' },
  { id: '80-19001', name: 'White', nameCN: '白色', rgb: [234, 239, 238], hex: '#eaefee', brand: 'perler' },
  { id: '80-19002', name: 'Creme', nameCN: '乳白色', rgb: [225, 226, 187], hex: '#e1e2bb', brand: 'perler' },
  { id: '80-19003', name: 'Yellow', nameCN: '黄色', rgb: [231, 206, 62], hex: '#e7ce3e', brand: 'perler' },
  { id: '80-19004', name: 'Orange', nameCN: '橙色', rgb: [235, 123, 49], hex: '#eb7b31', brand: 'perler' },
  { id: '80-19005', name: 'Red', nameCN: '红色', rgb: [176, 53, 60], hex: '#b0353c', brand: 'perler' },
  { id: '80-19006', name: 'Bubblegum', nameCN: '泡泡糖粉', rgb: [216, 114, 154], hex: '#d8729a', brand: 'perler' },
  { id: '80-19007', name: 'Purple', nameCN: '紫色', rgb: [104, 75, 134], hex: '#684b86', brand: 'perler' },
  { id: '80-19008', name: 'Dark Blue', nameCN: '深蓝色', rgb: [14, 80, 146], hex: '#0e5092', brand: 'perler' },
  { id: '80-19009', name: 'Light Blue', nameCN: '浅蓝色', rgb: [39, 140, 201], hex: '#278cc9', brand: 'perler' },
  { id: '80-19010', name: 'Dark Green', nameCN: '深绿色', rgb: [0, 123, 78], hex: '#007b4e', brand: 'perler' },
  { id: '80-19011', name: 'Light Green', nameCN: '浅绿色', rgb: [24, 199, 177], hex: '#18c7b1', brand: 'perler' },
  { id: '80-19012', name: 'Brown', nameCN: '棕色', rgb: [103, 76, 68], hex: '#674c44', brand: 'perler' },
  { id: '80-19017', name: 'Grey', nameCN: '灰色', rgb: [144, 148, 151], hex: '#909497', brand: 'perler' },
  { id: '80-19018', name: 'Black', nameCN: '黑色', rgb: [50, 50, 52], hex: '#323234', brand: 'perler' },
  { id: '80-19020', name: 'Rust', nameCN: '铁锈红', rgb: [153, 80, 67], hex: '#995043', brand: 'perler' },
  { id: '80-19021', name: 'Light Brown', nameCN: '浅棕色', rgb: [147, 104, 72], hex: '#936848', brand: 'perler' },
  { id: '80-19033', name: 'Peach', nameCN: '桃色', rgb: [233, 191, 185], hex: '#e9bfb9', brand: 'perler' },
  { id: '80-19035', name: 'Tan', nameCN: '棕褐色', rgb: [197, 172, 144], hex: '#c5ac90', brand: 'perler' },
  { id: '80-19038', name: 'Magenta', nameCN: '品红', rgb: [224, 66, 132], hex: '#e04284', brand: 'perler' },
  { id: '80-19052', name: 'Pastel Blue', nameCN: '粉彩蓝', rgb: [74, 156, 207], hex: '#4a9ccf', brand: 'perler' },
  { id: '80-19053', name: 'Pastel Green', nameCN: '粉彩绿', rgb: [109, 204, 148], hex: '#6dcc94', brand: 'perler' },
  { id: '80-19054', name: 'Pastel Lavender', nameCN: '粉彩薰衣草', rgb: [147, 127, 191], hex: '#937fbf', brand: 'perler' },
  { id: '80-19056', name: 'Pastel Yellow', nameCN: '粉彩黄', rgb: [233, 226, 144], hex: '#e9e290', brand: 'perler' },
  { id: '80-19057', name: 'Cheddar', nameCN: '切达橙', rgb: [251, 177, 70], hex: '#fbb146', brand: 'perler' },
  { id: '80-19058', name: 'Toothpaste', nameCN: '牙膏蓝', rgb: [150, 209, 212], hex: '#96d1d4', brand: 'perler' },
  { id: '80-19059', name: 'Hot Coral', nameCN: '热珊瑚红', rgb: [221, 89, 91], hex: '#dd595b', brand: 'perler' },
  { id: '80-19060', name: 'Plum', nameCN: '李子紫', rgb: [167, 93, 157], hex: '#a75d9d', brand: 'perler' },
  { id: '80-19061', name: 'Kiwi Lime', nameCN: '奇异果绿', rgb: [105, 184, 69], hex: '#69b845', brand: 'perler' },
  { id: '80-19062', name: 'Turquoise', nameCN: '绿松石', rgb: [0, 152, 197], hex: '#0098c5', brand: 'perler' },
  { id: '80-19063', name: 'Blush', nameCN: '腮红粉', rgb: [249, 146, 151], hex: '#f99297', brand: 'perler' },
  { id: '80-19070', name: 'Periwinkle Blue', nameCN: '长春花蓝', rgb: [102, 131, 183], hex: '#6683b7', brand: 'perler' },
  { id: '80-19079', name: 'Light Pink', nameCN: '浅粉色', rgb: [225, 188, 206], hex: '#e1bcce', brand: 'perler' },
  { id: '80-19080', name: 'Green', nameCN: '绿色', rgb: [77, 171, 100], hex: '#4dab64', brand: 'perler' },
  { id: '80-19083', name: 'Pink', nameCN: '粉色', rgb: [212, 84, 150], hex: '#d45496', brand: 'perler' },
  { id: '80-19088', name: 'Raspberry', nameCN: '覆盆子红', rgb: [152, 56, 100], hex: '#983864', brand: 'perler' },
  { id: '80-19090', name: 'Butterscotch', nameCN: '奶油糖色', rgb: [218, 153, 100], hex: '#da9964', brand: 'perler' },
  { id: '80-19091', name: 'Parrot Green', nameCN: '鹦鹉绿', rgb: [0, 145, 136], hex: '#009188', brand: 'perler' },
  { id: '80-19092', name: 'Dark Grey', nameCN: '深灰色', rgb: [88, 92, 97], hex: '#585c61', brand: 'perler' },
  { id: '80-19093', name: 'Blueberry Creme', nameCN: '蓝莓奶油', rgb: [133, 168, 227], hex: '#85a8e3', brand: 'perler' },
  { id: '80-19096', name: 'Cranapple', nameCN: '蔓越莓红', rgb: [132, 57, 71], hex: '#843947', brand: 'perler' },
  { id: '80-19097', name: 'Prickly Pear', nameCN: '仙人掌绿', rgb: [187, 201, 56], hex: '#bbc938', brand: 'perler' },
  { id: '80-19098', name: 'Sand', nameCN: '沙色', rgb: [229, 190, 158], hex: '#e5be9e', brand: 'perler' },
  { id: '80-15240', name: 'Mint', nameCN: '薄荷绿', rgb: [179, 238, 213], hex: '#b3eed5', brand: 'perler' },
  { id: '80-15241', name: 'Sour Apple', nameCN: '青苹果', rgb: [163, 222, 111], hex: '#a3de6f', brand: 'perler' },
  { id: '80-15242', name: 'Cotton Candy', nameCN: '棉花糖粉', rgb: [244, 121, 176], hex: '#f479b0', brand: 'perler' },
  { id: '80-15243', name: 'Grape', nameCN: '葡萄紫', rgb: [80, 59, 156], hex: '#503b9c', brand: 'perler' },
  { id: '80-15244', name: 'Rose', nameCN: '玫瑰红', rgb: [210, 93, 114], hex: '#d25d72', brand: 'perler' },
  { id: '80-15245', name: 'Iris', nameCN: '鸢尾紫', rgb: [78, 86, 163], hex: '#4e56a3', brand: 'perler' },
  { id: '80-15246', name: 'Tangerine', nameCN: '橘色', rgb: [253, 89, 24], hex: '#fd5918', brand: 'perler' },
  { id: '80-15247', name: 'Forest', nameCN: '森林绿', rgb: [0, 93, 87], hex: '#005d57', brand: 'perler' },
  { id: '80-15248', name: 'Eggplant', nameCN: '茄紫色', rgb: [111, 50, 85], hex: '#6f3255', brand: 'perler' },
  { id: '80-15249', name: 'Honey', nameCN: '蜂蜜色', rgb: [218, 140, 44], hex: '#da8c2c', brand: 'perler' },
  { id: '80-15250', name: 'Gingerbread', nameCN: '姜饼棕', rgb: [126, 84, 70], hex: '#7e5446', brand: 'perler' },
  { id: '80-15251', name: 'Thistle', nameCN: '蓟紫', rgb: [140, 140, 167], hex: '#8c8ca7', brand: 'perler' },
  { id: '80-15252', name: 'Slate Blue', nameCN: '石板蓝', rgb: [94, 109, 123], hex: '#5e6d7b', brand: 'perler' },
  { id: '80-15253', name: 'Denim', nameCN: '牛仔蓝', rgb: [76, 99, 136], hex: '#4c6388', brand: 'perler' },
  { id: '80-15254', name: 'Sage', nameCN: '鼠尾草绿', rgb: [154, 169, 142], hex: '#9aa98e', brand: 'perler' },
  { id: '80-15255', name: 'Orange Cream', nameCN: '橙奶油', rgb: [239, 183, 155], hex: '#efb79b', brand: 'perler' },
  { id: '80-15256', name: 'Fruit Punch', nameCN: '水果宾治', rgb: [202, 59, 101], hex: '#ca3b65', brand: 'perler' },
  { id: '80-15257', name: 'Fuchsia', nameCN: '紫红色', rgb: [203, 89, 185], hex: '#cb59b9', brand: 'perler' },
  { id: '80-15258', name: 'Mulberry', nameCN: '桑葚紫', rgb: [113, 72, 117], hex: '#714875', brand: 'perler' },
  { id: '80-15259', name: 'Slime', nameCN: '史莱姆绿', rgb: [200, 200, 92], hex: '#c8c85c', brand: 'perler' },
  { id: '80-15260', name: 'Stone', nameCN: '石头灰', rgb: [152, 140, 140], hex: '#988c8c', brand: 'perler' },
  { id: '80-15261', name: 'Dark Spruce', nameCN: '深云杉绿', rgb: [20, 49, 59], hex: '#14313b', brand: 'perler' },
  { id: '80-15262', name: 'Cocoa', nameCN: '可可棕', rgb: [57, 41, 40], hex: '#392928', brand: 'perler' },
  { id: '80-15265', name: 'Twilight Plum', nameCN: '暮光紫', rgb: [198, 133, 177], hex: '#c685b1', brand: 'perler' },
  { id: '80-15266', name: 'Caribbean Sea', nameCN: '加勒比海蓝', rgb: [108, 200, 173], hex: '#6cc8ad', brand: 'perler' },
  { id: '80-15267', name: 'Frosted Lilac', nameCN: '霜丁香', rgb: [205, 183, 195], hex: '#cdb7c3', brand: 'perler' },
  { id: '80-15273', name: 'Brick', nameCN: '砖红色', rgb: [252, 149, 116], hex: '#fc9574', brand: 'perler' },
  { id: '80-15274', name: 'Rich Butter', nameCN: '浓黄油色', rgb: [246, 202, 105], hex: '#f6ca69', brand: 'perler' },
  { id: '80-15275', name: 'Peacock', nameCN: '孔雀蓝', rgb: [0, 144, 172], hex: '#0090ac', brand: 'perler' },
  { id: '80-15089', name: 'Neon Blue', nameCN: '荧光蓝', rgb: [64, 106, 225], hex: '#406ae1', brand: 'perler' },
  { id: '80-15268', name: 'Sunflower', nameCN: '向日葵黄', rgb: [222, 186, 11], hex: '#deba0b', brand: 'perler' },
  { id: '80-15269', name: 'Lemon', nameCN: '柠檬黄', rgb: [246, 217, 1], hex: '#f6d901', brand: 'perler' },
  { id: '80-15263', name: 'Celery', nameCN: '芹菜绿', rgb: [190, 212, 166], hex: '#bed4a6', brand: 'perler' },
  { id: '80-15239', name: 'Mocha', nameCN: '摩卡棕', rgb: [200, 182, 147], hex: '#c8b693', brand: 'perler' },
  { id: '80-15272', name: 'Coral', nameCN: '珊瑚色', rgb: [255, 154, 139], hex: '#ff9a8b', brand: 'perler' },
];

// ============ Hama 色板 (丹麦) - 80色 ============
export const hamaColors: BeadColor[] = [
  { id: 'H01', name: 'White', nameCN: '白色', rgb: [229, 236, 241], hex: '#e5ecf1', brand: 'hama' },
  { id: 'H02', name: 'Cream', nameCN: '奶油色', rgb: [228, 228, 197], hex: '#e4e4c5', brand: 'hama' },
  { id: 'H03', name: 'Yellow', nameCN: '黄色', rgb: [233, 199, 4], hex: '#e9c704', brand: 'hama' },
  { id: 'H04', name: 'Orange', nameCN: '橙色', rgb: [209, 72, 3], hex: '#d14803', brand: 'hama' },
  { id: 'H05', name: 'Red', nameCN: '红色', rgb: [180, 6, 14], hex: '#b4060e', brand: 'hama' },
  { id: 'H06', name: 'Pink', nameCN: '粉色', rgb: [234, 138, 165], hex: '#ea8aa5', brand: 'hama' },
  { id: 'H07', name: 'Purple', nameCN: '紫色', rgb: [113, 34, 151], hex: '#712297', brand: 'hama' },
  { id: 'H08', name: 'Blue', nameCN: '蓝色', rgb: [2, 57, 163], hex: '#0239a3', brand: 'hama' },
  { id: 'H09', name: 'Light Blue', nameCN: '浅蓝色', rgb: [2, 91, 195], hex: '#025bc3', brand: 'hama' },
  { id: 'H10', name: 'Green', nameCN: '绿色', rgb: [2, 118, 67], hex: '#027643', brand: 'hama' },
  { id: 'H11', name: 'Light Green', nameCN: '浅绿色', rgb: [25, 205, 167], hex: '#19cda7', brand: 'hama' },
  { id: 'H12', name: 'Brown', nameCN: '棕色', rgb: [62, 39, 26], hex: '#3e271a', brand: 'hama' },
  { id: 'H13', name: 'Transparent Red', nameCN: '透明红', rgb: [192, 36, 53], hex: '#c02435', brand: 'hama' },
  { id: 'H14', name: 'Transparent Yellow', nameCN: '透明黄', rgb: [228, 170, 50], hex: '#e4aa32', brand: 'hama' },
  { id: 'H16', name: 'Transparent Green', nameCN: '透明绿', rgb: [55, 184, 118], hex: '#37b876', brand: 'hama' },
  { id: 'H17', name: 'Grey', nameCN: '灰色', rgb: [131, 143, 152], hex: '#838f98', brand: 'hama' },
  { id: 'H18', name: 'Black', nameCN: '黑色', rgb: [20, 19, 21], hex: '#141315', brand: 'hama' },
  { id: 'H19', name: 'Clear', nameCN: '透明', rgb: [216, 210, 206], hex: '#d8d2ce', brand: 'hama' },
  { id: 'H20', name: 'Reddish Brown', nameCN: '红棕色', rgb: [141, 42, 15], hex: '#8d2a0f', brand: 'hama' },
  { id: 'H21', name: 'Light Brown', nameCN: '浅棕色', rgb: [190, 108, 33], hex: '#be6c21', brand: 'hama' },
  { id: 'H22', name: 'Dark Red', nameCN: '深红色', rgb: [145, 2, 10], hex: '#91020a', brand: 'hama' },
  { id: 'H24', name: 'Translucent Purple', nameCN: '半透明紫', rgb: [104, 62, 154], hex: '#683e9a', brand: 'hama' },
  { id: 'H25', name: 'Translucent Brown', nameCN: '半透明棕', rgb: [135, 89, 61], hex: '#87593d', brand: 'hama' },
  { id: 'H26', name: 'Matt Rose', nameCN: '哑光玫瑰', rgb: [232, 164, 152], hex: '#e8a498', brand: 'hama' },
  { id: 'H27', name: 'Beige', nameCN: '米色', rgb: [220, 177, 142], hex: '#dcb18e', brand: 'hama' },
  { id: 'H28', name: 'Dark Green', nameCN: '深绿色', rgb: [30, 44, 28], hex: '#1e2c1c', brand: 'hama' },
  { id: 'H29', name: 'Claret', nameCN: '深紫红', rgb: [191, 1, 66], hex: '#bf0142', brand: 'hama' },
  { id: 'H30', name: 'Burgundy', nameCN: '酒红色', rgb: [78, 12, 27], hex: '#4e0c1b', brand: 'hama' },
  { id: 'H31', name: 'Turquoise', nameCN: '绿松石', rgb: [72, 154, 185], hex: '#489ab9', brand: 'hama' },
  { id: 'H32', name: 'Neon Fuchsia', nameCN: '荧光紫红', rgb: [255, 32, 141], hex: '#ff208d', brand: 'hama' },
  { id: 'H33', name: 'Cerise', nameCN: '樱桃色', rgb: [255, 57, 86], hex: '#ff3956', brand: 'hama' },
  { id: 'H34', name: 'Neon Yellow', nameCN: '荧光黄', rgb: [229, 239, 19], hex: '#e5ef13', brand: 'hama' },
  { id: 'H35', name: 'Neon Red', nameCN: '荧光红', rgb: [255, 40, 51], hex: '#ff2833', brand: 'hama' },
  { id: 'H36', name: 'Neon Blue', nameCN: '荧光蓝', rgb: [35, 83, 176], hex: '#2353b0', brand: 'hama' },
  { id: 'H37', name: 'Neon Green', nameCN: '荧光绿', rgb: [6, 183, 60], hex: '#06b73c', brand: 'hama' },
  { id: 'H38', name: 'Neon Orange', nameCN: '荧光橙', rgb: [253, 134, 0], hex: '#fd8600', brand: 'hama' },
  { id: 'H39', name: 'Fluorescent Yellow', nameCN: '荧光黄', rgb: [241, 242, 28], hex: '#f1f21c', brand: 'hama' },
  { id: 'H40', name: 'Fluorescent Orange', nameCN: '荧光橙', rgb: [254, 99, 11], hex: '#fe630b', brand: 'hama' },
  { id: 'H41', name: 'Fluorescent Blue', nameCN: '荧光蓝', rgb: [38, 89, 178], hex: '#2659b2', brand: 'hama' },
  { id: 'H42', name: 'Fluorescent Green', nameCN: '荧光绿', rgb: [12, 189, 81], hex: '#0cbd51', brand: 'hama' },
  { id: 'H43', name: 'Pastel Yellow', nameCN: '粉彩黄', rgb: [231, 228, 90], hex: '#e7e45a', brand: 'hama' },
  { id: 'H44', name: 'Pastel Red', nameCN: '粉彩红', rgb: [249, 97, 96], hex: '#f96160', brand: 'hama' },
  { id: 'H45', name: 'Pastel Purple', nameCN: '粉彩紫', rgb: [142, 105, 205], hex: '#8e69cd', brand: 'hama' },
  { id: 'H46', name: 'Pastel Blue', nameCN: '粉彩蓝', rgb: [81, 174, 228], hex: '#51aee4', brand: 'hama' },
  { id: 'H47', name: 'Pastel Green', nameCN: '粉彩绿', rgb: [128, 223, 150], hex: '#80df96', brand: 'hama' },
  { id: 'H48', name: 'Pastel Pink', nameCN: '粉彩粉', rgb: [214, 122, 209], hex: '#d67ad1', brand: 'hama' },
  { id: 'H49', name: 'Azure', nameCN: '蔚蓝', rgb: [15, 172, 209], hex: '#0facd1', brand: 'hama' },
  { id: 'H60', name: 'Teddybear Brown', nameCN: '泰迪熊棕', rgb: [240, 152, 30], hex: '#f0981e', brand: 'hama' },
  { id: 'H70', name: 'Light Grey', nameCN: '浅灰色', rgb: [165, 179, 192], hex: '#a5b3c0', brand: 'hama' },
  { id: 'H71', name: 'Dark Grey', nameCN: '深灰色', rgb: [68, 80, 89], hex: '#445059', brand: 'hama' },
  { id: 'H75', name: 'Tan', nameCN: '棕褐色', rgb: [183, 140, 109], hex: '#b78c6d', brand: 'hama' },
  { id: 'H76', name: 'Nougat', nameCN: '牛轧糖色', rgb: [138, 89, 55], hex: '#8a5937', brand: 'hama' },
  { id: 'H77', name: 'Cloudy White', nameCN: '云白色', rgb: [206, 209, 200], hex: '#ced1c8', brand: 'hama' },
  { id: 'H78', name: 'Light Peach', nameCN: '浅桃色', rgb: [247, 193, 170], hex: '#f7c1aa', brand: 'hama' },
  { id: 'H79', name: 'Apricot', nameCN: '杏色', rgb: [248, 118, 51], hex: '#f87633', brand: 'hama' },
  { id: 'H82', name: 'Plum', nameCN: '李子紫', rgb: [145, 23, 90], hex: '#91175a', brand: 'hama' },
  { id: 'H83', name: 'Petrol Blue', nameCN: '石油蓝', rgb: [3, 122, 159], hex: '#037a9f', brand: 'hama' },
  { id: 'H84', name: 'Olive Green', nameCN: '橄榄绿', rgb: [104, 120, 54], hex: '#687836', brand: 'hama' },
  { id: 'H95', name: 'Pastel Rose', nameCN: '粉彩玫瑰', rgb: [221, 155, 163], hex: '#dd9ba3', brand: 'hama' },
  { id: 'H96', name: 'Pastel Lilac', nameCN: '粉彩丁香', rgb: [180, 145, 173], hex: '#b491ad', brand: 'hama' },
  { id: 'H97', name: 'Pastel Ice Blue', nameCN: '粉彩冰蓝', rgb: [138, 175, 194], hex: '#8aafc2', brand: 'hama' },
  { id: 'H98', name: 'Pastel Mint', nameCN: '粉彩薄荷', rgb: [148, 204, 164], hex: '#94cca4', brand: 'hama' },
  { id: 'H15', name: 'Transparent Blue', nameCN: '透明蓝', rgb: [72, 126, 213], hex: '#487ed5', brand: 'hama' },
  { id: 'H55', name: 'Green (Glow in the Dark)', nameCN: '夜光绿', rgb: [250, 248, 237], hex: '#faf8ed', brand: 'hama' },
  { id: 'H56', name: 'Red (Glow in the Dark)', nameCN: '夜光红', rgb: [237, 191, 159], hex: '#edbf9f', brand: 'hama' },
  { id: 'H57', name: 'Blue (Glow in the Dark)', nameCN: '夜光蓝', rgb: [196, 208, 227], hex: '#c4d0e3', brand: 'hama' },
  { id: 'H61', name: 'Gold', nameCN: '金色', rgb: [217, 147, 80], hex: '#d99350', brand: 'hama' },
  { id: 'H62', name: 'Silver', nameCN: '银色', rgb: [72, 71, 74], hex: '#48474a', brand: 'hama' },
  { id: 'H63', name: 'Bronze', nameCN: '青铜色', rgb: [66, 49, 47], hex: '#42312f', brand: 'hama' },
  { id: 'H64', name: 'Pearl', nameCN: '珍珠白', rgb: [239, 235, 228], hex: '#efebe4', brand: 'hama' },
  { id: 'H72', name: 'Translucent Pink', nameCN: '半透明粉', rgb: [240, 151, 176], hex: '#f097b0', brand: 'hama' },
  { id: 'H73', name: 'Translucent Aqua', nameCN: '半透明水蓝', rgb: [89, 174, 245], hex: '#59aef5', brand: 'hama' },
  { id: 'H74', name: 'Translucent Lilac', nameCN: '半透明丁香', rgb: [91, 85, 189], hex: '#5b55bd', brand: 'hama' },
  { id: 'H101', name: 'Eucalyptus', nameCN: '尤加利绿', rgb: [169, 195, 155], hex: '#a9c39b', brand: 'hama' },
  { id: 'H102', name: 'Forest Green', nameCN: '森林绿', rgb: [53, 107, 45], hex: '#356b2d', brand: 'hama' },
  { id: 'H103', name: 'Light Yellow', nameCN: '浅黄色', rgb: [255, 230, 96], hex: '#ffe660', brand: 'hama' },
  { id: 'H104', name: 'Lime', nameCN: '青柠绿', rgb: [188, 209, 34], hex: '#bcd122', brand: 'hama' },
  { id: 'H105', name: 'Light Apricot', nameCN: '浅杏色', rgb: [255, 172, 120], hex: '#ffac78', brand: 'hama' },
  { id: 'H106', name: 'Light Lavender', nameCN: '浅薰衣草', rgb: [204, 197, 237], hex: '#ccc5ed', brand: 'hama' },
  { id: 'H107', name: 'Lavender', nameCN: '薰衣草', rgb: [106, 135, 193], hex: '#6a87c1', brand: 'hama' },
];

// ============ Artkal C 色板 (中国) - 174色 ============
export const artkalColors: BeadColor[] = [
  { id: 'C01', name: 'White', nameCN: '白色', rgb: [234, 238, 243], hex: '#eaeef3', brand: 'artkal' },
  { id: 'C02', name: 'Black', nameCN: '黑色', rgb: [41, 42, 43], hex: '#292a2b', brand: 'artkal' },
  { id: 'C03', name: 'Tangerine', nameCN: '橘色', rgb: [255, 166, 48], hex: '#ffa630', brand: 'artkal' },
  { id: 'C04', name: 'Yellow Orange', nameCN: '橙黄色', rgb: [230, 135, 57], hex: '#e68739', brand: 'artkal' },
  { id: 'C05', name: 'Tall Poppy', nameCN: '罂粟红', rgb: [203, 53, 49], hex: '#cb3531', brand: 'artkal' },
  { id: 'C06', name: 'Red', nameCN: '红色', rgb: [182, 25, 39], hex: '#b61927', brand: 'artkal' },
  { id: 'C07', name: 'Carnation Pink', nameCN: '康乃馨粉', rgb: [225, 130, 176], hex: '#e182b0', brand: 'artkal' },
  { id: 'C08', name: 'Hot Pink', nameCN: '亮粉色', rgb: [220, 81, 154], hex: '#dc519a', brand: 'artkal' },
  { id: 'C09', name: 'Magenta', nameCN: '品红', rgb: [218, 67, 131], hex: '#da4383', brand: 'artkal' },
  { id: 'C10', name: 'Picasso', nameCN: '毕加索黄', rgb: [234, 222, 127], hex: '#eade7f', brand: 'artkal' },
  { id: 'C11', name: 'Yellow', nameCN: '黄色', rgb: [234, 193, 37], hex: '#eac125', brand: 'artkal' },
  { id: 'C12', name: 'Pistachio', nameCN: '开心果绿', rgb: [151, 207, 135], hex: '#97cf87', brand: 'artkal' },
  { id: 'C13', name: 'Pastel Green', nameCN: '粉彩绿', rgb: [139, 178, 58], hex: '#8bb23a', brand: 'artkal' },
  { id: 'C14', name: 'Green', nameCN: '绿色', rgb: [0, 144, 83], hex: '#009053', brand: 'artkal' },
  { id: 'C15', name: 'Green Tea', nameCN: '绿茶色', rgb: [0, 118, 95], hex: '#00765f', brand: 'artkal' },
  { id: 'C16', name: 'Bright Carrot', nameCN: '胡萝卜橙', rgb: [249, 111, 64], hex: '#f96f40', brand: 'artkal' },
  { id: 'C17', name: 'Orange', nameCN: '橙色', rgb: [235, 96, 39], hex: '#eb6027', brand: 'artkal' },
  { id: 'C18', name: 'Sky Blue', nameCN: '天蓝色', rgb: [167, 205, 222], hex: '#a7cdde', brand: 'artkal' },
  { id: 'C19', name: 'Baby Blue', nameCN: '婴儿蓝', rgb: [46, 171, 216], hex: '#2eabd8', brand: 'artkal' },
  { id: 'C20', name: 'Light Blue', nameCN: '浅蓝色', rgb: [0, 132, 206], hex: '#0084ce', brand: 'artkal' },
  { id: 'C21', name: 'Dark Blue', nameCN: '深蓝色', rgb: [0, 79, 164], hex: '#004fa4', brand: 'artkal' },
  { id: 'C22', name: 'Bubble Gun', nameCN: '泡泡粉', rgb: [242, 191, 184], hex: '#f2bfb8', brand: 'artkal' },
  { id: 'C23', name: 'Sand', nameCN: '沙色', rgb: [220, 163, 132], hex: '#dca384', brand: 'artkal' },
  { id: 'C24', name: 'Beeswax', nameCN: '蜂蜡色', rgb: [238, 211, 158], hex: '#eed39e', brand: 'artkal' },
  { id: 'C25', name: 'Lavender', nameCN: '薰衣草', rgb: [138, 126, 194], hex: '#8a7ec2', brand: 'artkal' },
  { id: 'C26', name: 'Pastel Lavender', nameCN: '粉彩薰衣草', rgb: [145, 101, 178], hex: '#9165b2', brand: 'artkal' },
  { id: 'C27', name: 'Purple', nameCN: '紫色', rgb: [72, 51, 126], hex: '#48337e', brand: 'artkal' },
  { id: 'C28', name: 'Marigold', nameCN: '万寿菊橙', rgb: [178, 121, 56], hex: '#b27938', brand: 'artkal' },
  { id: 'C29', name: 'Buccaneer', nameCN: '海盗红', rgb: [179, 85, 64], hex: '#b35540', brand: 'artkal' },
  { id: 'C30', name: 'Redwood', nameCN: '红木色', rgb: [154, 69, 65], hex: '#9a4541', brand: 'artkal' },
  { id: 'C31', name: 'Light Brown', nameCN: '浅棕色', rgb: [137, 93, 73], hex: '#895d49', brand: 'artkal' },
  { id: 'C32', name: 'Brown', nameCN: '棕色', rgb: [101, 70, 61], hex: '#65463d', brand: 'artkal' },
  { id: 'C33', name: 'Gray', nameCN: '灰色', rgb: [149, 150, 152], hex: '#959698', brand: 'artkal' },
  { id: 'C34', name: 'Dark Gray', nameCN: '深灰色', rgb: [112, 117, 123], hex: '#70757b', brand: 'artkal' },
  { id: 'C35', name: 'Silver', nameCN: '银色', rgb: [103, 107, 115], hex: '#676b73', brand: 'artkal' },
  { id: 'C36', name: 'Old Pink', nameCN: '复古粉', rgb: [206, 109, 131], hex: '#ce6d83', brand: 'artkal' },
  { id: 'C37', name: 'True Blue', nameCN: '正蓝色', rgb: [0, 120, 191], hex: '#0078bf', brand: 'artkal' },
  { id: 'C38', name: 'Turquoise', nameCN: '绿松石', rgb: [85, 164, 217], hex: '#55a4d9', brand: 'artkal' },
  { id: 'C39', name: 'Shadow Green', nameCN: '阴影绿', rgb: [158, 201, 205], hex: '#9ec9cd', brand: 'artkal' },
  { id: 'C40', name: 'Key Lomen Pie', nameCN: '柠檬派黄', rgb: [205, 192, 63], hex: '#cdc03f', brand: 'artkal' },
  { id: 'C41', name: 'Pastel Yellow', nameCN: '粉彩黄', rgb: [225, 211, 103], hex: '#e1d367', brand: 'artkal' },
  { id: 'C42', name: 'Sandstorm', nameCN: '沙尘黄', rgb: [225, 200, 53], hex: '#e1c835', brand: 'artkal' },
  { id: 'C43', name: 'Paprika', nameCN: '辣椒红', rgb: [177, 24, 54], hex: '#b11836', brand: 'artkal' },
  { id: 'C44', name: 'Burning Sand', nameCN: '燃沙橙', rgb: [238, 146, 124], hex: '#ee927c', brand: 'artkal' },
  { id: 'C46', name: 'Canary', nameCN: '金丝雀黄', rgb: [226, 230, 93], hex: '#e2e65d', brand: 'artkal' },
  { id: 'C47', name: 'Vanilla', nameCN: '香草色', rgb: [233, 193, 166], hex: '#e9c1a6', brand: 'artkal' },
  { id: 'C48', name: 'Corn', nameCN: '玉米黄', rgb: [236, 192, 61], hex: '#ecc03d', brand: 'artkal' },
  { id: 'C49', name: 'Raspberry Pink', nameCN: '覆盆子粉', rgb: [239, 103, 178], hex: '#ef67b2', brand: 'artkal' },
  { id: 'C50', name: 'Maverick', nameCN: '淡紫色', rgb: [192, 183, 215], hex: '#c0b7d7', brand: 'artkal' },
  { id: 'C51', name: 'Spring Sun', nameCN: '春阳色', rgb: [223, 218, 189], hex: '#dfdabd', brand: 'artkal' },
  { id: 'C52', name: 'Butterfly Bush', nameCN: '蝴蝶紫', rgb: [79, 57, 137], hex: '#4f3989', brand: 'artkal' },
  { id: 'C53', name: 'Bright Green', nameCN: '亮绿色', rgb: [142, 195, 36], hex: '#8ec324', brand: 'artkal' },
  { id: 'C54', name: 'Medium Turquoise', nameCN: '中绿松石', rgb: [0, 165, 161], hex: '#00a5a1', brand: 'artkal' },
  { id: 'C56', name: 'Oslo Gray', nameCN: '奥斯陆灰', rgb: [130, 135, 139], hex: '#82878b', brand: 'artkal' },
  { id: 'C58', name: 'Black Rock', nameCN: '黑岩色', rgb: [54, 56, 77], hex: '#36384d', brand: 'artkal' },
  { id: 'C60', name: 'Sea Mist', nameCN: '海雾绿', rgb: [178, 215, 206], hex: '#b2d7ce', brand: 'artkal' },
  { id: 'C69', name: 'Mine Shaft', nameCN: '矿井灰', rgb: [56, 62, 68], hex: '#383e44', brand: 'artkal' },
  { id: 'C70', name: 'Brunswick Green', nameCN: '不伦瑞克绿', rgb: [21, 56, 56], hex: '#153838', brand: 'artkal' },
  { id: 'C71', name: 'Goldenrod', nameCN: '金菊色', rgb: [232, 174, 0], hex: '#e8ae00', brand: 'artkal' },
  { id: 'C72', name: 'Pastel Orange', nameCN: '粉彩橙', rgb: [217, 179, 94], hex: '#d9b35e', brand: 'artkal' },
  { id: 'C73', name: 'Sienna', nameCN: '赭石色', rgb: [187, 104, 51], hex: '#bb6833', brand: 'artkal' },
  { id: 'C74', name: 'Deer', nameCN: '鹿皮色', rgb: [205, 178, 119], hex: '#cdb277', brand: 'artkal' },
  { id: 'C75', name: 'Clay', nameCN: '粘土色', rgb: [170, 116, 78], hex: '#aa744e', brand: 'artkal' },
  { id: 'C76', name: 'Coral Red', nameCN: '珊瑚红', rgb: [236, 98, 94], hex: '#ec625e', brand: 'artkal' },
  { id: 'C77', name: 'Deep Chestnut', nameCN: '深栗色', rgb: [190, 93, 101], hex: '#be5d65', brand: 'artkal' },
  { id: 'C78', name: 'Red Wine', nameCN: '红酒色', rgb: [153, 50, 58], hex: '#99323a', brand: 'artkal' },
  { id: 'C79', name: 'Light Sea Blue', nameCN: '浅海蓝', rgb: [104, 196, 210], hex: '#68c4d2', brand: 'artkal' },
  { id: 'C80', name: 'Sea Blue', nameCN: '海蓝色', rgb: [0, 147, 169], hex: '#0093a9', brand: 'artkal' },
  { id: 'C81', name: 'Steel Blue', nameCN: '钢蓝色', rgb: [90, 176, 191], hex: '#5ab0bf', brand: 'artkal' },
  { id: 'C82', name: 'Azure', nameCN: '蔚蓝', rgb: [0, 158, 194], hex: '#009ec2', brand: 'artkal' },
  { id: 'C83', name: 'Dark Steel Blue', nameCN: '深钢蓝', rgb: [0, 132, 178], hex: '#0084b2', brand: 'artkal' },
  { id: 'C84', name: 'Drark Algae', nameCN: '暗海藻绿', rgb: [173, 173, 41], hex: '#adad29', brand: 'artkal' },
  { id: 'C85', name: 'Dark Olive', nameCN: '深橄榄绿', rgb: [143, 142, 60], hex: '#8f8e3c', brand: 'artkal' },
  { id: 'C86', name: 'Jade Green', nameCN: '翡翠绿', rgb: [0, 125, 43], hex: '#007d2b', brand: 'artkal' },
  { id: 'C87', name: 'Ghost While', nameCN: '幽灵白', rgb: [212, 216, 211], hex: '#d4d8d3', brand: 'artkal' },
  { id: 'C88', name: 'Ash Grey', nameCN: '灰烬色', rgb: [194, 196, 194], hex: '#c2c4c2', brand: 'artkal' },
  { id: 'C89', name: 'Light Gray', nameCN: '浅灰色', rgb: [167, 172, 173], hex: '#a7acad', brand: 'artkal' },
  { id: 'C90', name: 'Charcoal Gray', nameCN: '木炭灰', rgb: [86, 90, 94], hex: '#565a5e', brand: 'artkal' },
  { id: 'C91', name: 'Dandelion', nameCN: '蒲公英黄', rgb: [206, 164, 51], hex: '#cea433', brand: 'artkal' },
  { id: 'C92', name: 'Pale Skin', nameCN: '浅肤色', rgb: [220, 183, 148], hex: '#dcb794', brand: 'artkal' },
  { id: 'C93', name: 'Warm Blush', nameCN: '暖腮红', rgb: [221, 146, 133], hex: '#dd9285', brand: 'artkal' },
  { id: 'C94', name: 'Salmon', nameCN: '鲑鱼粉', rgb: [224, 123, 105], hex: '#e07b69', brand: 'artkal' },
  { id: 'C95', name: 'Apricot', nameCN: '杏色', rgb: [239, 127, 97], hex: '#ef7f61', brand: 'artkal' },
  { id: 'C96', name: 'Papaya', nameCN: '木瓜色', rgb: [220, 119, 43], hex: '#dc772b', brand: 'artkal' },
  { id: 'C97', name: 'Himalaya Blue', nameCN: '喜马拉雅蓝', rgb: [106, 174, 219], hex: '#6aaedb', brand: 'artkal' },
  { id: 'C98', name: 'Waterfall', nameCN: '瀑布蓝', rgb: [97, 187, 211], hex: '#61bbd3', brand: 'artkal' },
  { id: 'C99', name: 'Lagoon', nameCN: '泻湖蓝', rgb: [39, 155, 190], hex: '#279bbe', brand: 'artkal' },
  { id: 'C100', name: 'Electric Blue', nameCN: '电光蓝', rgb: [0, 167, 227], hex: '#00a7e3', brand: 'artkal' },
  { id: 'C101', name: 'Pool Blue', nameCN: '泳池蓝', rgb: [0, 119, 202], hex: '#0077ca', brand: 'artkal' },
  { id: 'C102', name: 'Caribbian Blue', nameCN: '加勒比蓝', rgb: [0, 90, 169], hex: '#005aa9', brand: 'artkal' },
  { id: 'C103', name: 'Deep Water', nameCN: '深水蓝', rgb: [0, 127, 158], hex: '#007f9e', brand: 'artkal' },
  { id: 'C104', name: 'Petrol Blue', nameCN: '石油蓝', rgb: [0, 125, 145], hex: '#007d91', brand: 'artkal' },
  { id: 'C105', name: 'Wegdewood Blue', nameCN: '韦奇伍德蓝', rgb: [0, 100, 154], hex: '#00649a', brand: 'artkal' },
  { id: 'C106', name: 'Pond Blue', nameCN: '池塘蓝', rgb: [0, 108, 159], hex: '#006c9f', brand: 'artkal' },
  { id: 'C107', name: 'Seashell Beige', nameCN: '贝壳米色', rgb: [207, 193, 121], hex: '#cfc179', brand: 'artkal' },
  { id: 'C108', name: 'Beige', nameCN: '米色', rgb: [196, 174, 100], hex: '#c4ae64', brand: 'artkal' },
  { id: 'C109', name: 'Beach Beige', nameCN: '沙滩米色', rgb: [171, 151, 69], hex: '#ab9745', brand: 'artkal' },
  { id: 'C110', name: 'Caffe Latté', nameCN: '拿铁咖啡', rgb: [151, 129, 56], hex: '#978138', brand: 'artkal' },
  { id: 'C111', name: 'Oaktree Brown', nameCN: '橡树棕', rgb: [144, 124, 65], hex: '#907c41', brand: 'artkal' },
  { id: 'C112', name: 'Khaki', nameCN: '卡其色', rgb: [182, 174, 132], hex: '#b6ae84', brand: 'artkal' },
  { id: 'C113', name: 'Light Greengray', nameCN: '浅绿灰', rgb: [165, 159, 101], hex: '#a59f65', brand: 'artkal' },
  { id: 'C114', name: 'Mossy Green', nameCN: '苔藓绿', rgb: [147, 141, 84], hex: '#938d54', brand: 'artkal' },
  { id: 'C115', name: 'Earth Green', nameCN: '大地绿', rgb: [141, 139, 81], hex: '#8d8b51', brand: 'artkal' },
  { id: 'C116', name: 'Sage Green', nameCN: '鼠尾草绿', rgb: [127, 126, 73], hex: '#7f7e49', brand: 'artkal' },
  { id: 'C117', name: 'Pinetree Green', nameCN: '松树绿', rgb: [91, 110, 53], hex: '#5b6e35', brand: 'artkal' },
  { id: 'C118', name: 'Frosty Blue', nameCN: '霜蓝色', rgb: [138, 213, 201], hex: '#8ad5c9', brand: 'artkal' },
  { id: 'C119', name: 'Polar Mint', nameCN: '极地薄荷', rgb: [124, 210, 165], hex: '#7cd2a5', brand: 'artkal' },
  { id: 'C120', name: 'Celadon Green', nameCN: '青瓷绿', rgb: [114, 172, 154], hex: '#72ac9a', brand: 'artkal' },
  { id: 'C121', name: 'Eucalyptus', nameCN: '尤加利绿', rgb: [0, 178, 111], hex: '#00b26f', brand: 'artkal' },
  { id: 'C122', name: 'Clover Field', nameCN: '三叶草绿', rgb: [62, 183, 36], hex: '#3eb724', brand: 'artkal' },
  { id: 'C123', name: 'Pooltable Felt', nameCN: '台球桌绿', rgb: [13, 117, 53], hex: '#0d7535', brand: 'artkal' },
  { id: 'C124', name: 'Snake Green', nameCN: '蛇绿色', rgb: [0, 125, 110], hex: '#007d6e', brand: 'artkal' },
  { id: 'C125', name: 'Dark Eucalyptus', nameCN: '深尤加利绿', rgb: [0, 110, 105], hex: '#006e69', brand: 'artkal' },
  { id: 'C126', name: 'Marsmallow Rose', nameCN: '棉花糖粉', rgb: [223, 195, 225], hex: '#dfc3e1', brand: 'artkal' },
  { id: 'C127', name: 'Light Grape', nameCN: '浅葡萄紫', rgb: [211, 142, 212], hex: '#d38ed4', brand: 'artkal' },
  { id: 'C128', name: 'Rosebud Pink', nameCN: '玫瑰花蕾粉', rgb: [213, 166, 186], hex: '#d5a6ba', brand: 'artkal' },
  { id: 'C129', name: 'Fuschia', nameCN: '紫红色', rgb: [214, 102, 142], hex: '#d6668e', brand: 'artkal' },
  { id: 'C130', name: 'Candy Violet', nameCN: '糖果紫', rgb: [184, 170, 217], hex: '#b8aad9', brand: 'artkal' },
  { id: 'C131', name: 'Flamingo', nameCN: '火烈鸟粉', rgb: [223, 72, 109], hex: '#df486d', brand: 'artkal' },
  { id: 'C132', name: 'Pink Plum', nameCN: '粉李紫', rgb: [188, 60, 166], hex: '#bc3ca6', brand: 'artkal' },
  { id: 'C133', name: 'Amethyst', nameCN: '紫水晶', rgb: [128, 56, 151], hex: '#803897', brand: 'artkal' },
  { id: 'C134', name: 'Moonlight Blue', nameCN: '月光蓝', rgb: [167, 186, 225], hex: '#a7bae1', brand: 'artkal' },
  { id: 'C135', name: 'Summer Rain', nameCN: '夏雨蓝', rgb: [175, 184, 223], hex: '#afb8df', brand: 'artkal' },
  { id: 'C136', name: 'Azur Blue', nameCN: '天青蓝', rgb: [107, 154, 212], hex: '#6b9ad4', brand: 'artkal' },
  { id: 'C137', name: 'Cornflower Blue', nameCN: '矢车菊蓝', rgb: [90, 137, 206], hex: '#5a89ce', brand: 'artkal' },
  { id: 'C138', name: 'Forget Me Not', nameCN: '勿忘我蓝', rgb: [101, 138, 208], hex: '#658ad0', brand: 'artkal' },
  { id: 'C139', name: 'Indigo', nameCN: '靛蓝', rgb: [86, 108, 189], hex: '#566cbd', brand: 'artkal' },
  { id: 'C140', name: 'Horizon Blue', nameCN: '地平线蓝', rgb: [77, 116, 198], hex: '#4d74c6', brand: 'artkal' },
  { id: 'C141', name: 'Cobolt', nameCN: '钴蓝', rgb: [65, 109, 190], hex: '#416dbe', brand: 'artkal' },
  { id: 'C142', name: 'Royal Blue', nameCN: '皇家蓝', rgb: [48, 66, 158], hex: '#30429e', brand: 'artkal' },
  { id: 'C143', name: 'Marine', nameCN: '海军蓝', rgb: [2, 66, 136], hex: '#024288', brand: 'artkal' },
  { id: 'C144', name: 'Pale Yellow Moss', nameCN: '浅黄苔藓', rgb: [214, 202, 106], hex: '#d6ca6a', brand: 'artkal' },
  { id: 'C145', name: 'Bloodrose Red', nameCN: '血玫瑰红', rgb: [157, 26, 56], hex: '#9d1a38', brand: 'artkal' },
  { id: 'C146', name: 'Spearmint', nameCN: '留兰香绿', rgb: [128, 183, 161], hex: '#80b7a1', brand: 'artkal' },
  { id: 'C147', name: 'Mocha', nameCN: '摩卡棕', rgb: [122, 89, 79], hex: '#7a594f', brand: 'artkal' },
  { id: 'C148', name: 'Creme', nameCN: '乳白色', rgb: [239, 219, 161], hex: '#efdba1', brand: 'artkal' },
  { id: 'C149', name: 'Iris Violet', nameCN: '鸢尾紫', rgb: [136, 132, 208], hex: '#8884d0', brand: 'artkal' },
  { id: 'C150', name: 'Forrest Green', nameCN: '森林绿', rgb: [52, 86, 33], hex: '#345621', brand: 'artkal' },
  { id: 'C151', name: 'Lilac', nameCN: '丁香紫', rgb: [174, 173, 220], hex: '#aeaddc', brand: 'artkal' },
  { id: 'C152', name: 'Pale Lilac', nameCN: '浅丁香紫', rgb: [188, 195, 225], hex: '#bcc3e1', brand: 'artkal' },
  { id: 'C153', name: 'Sahara Sand', nameCN: '撒哈拉沙', rgb: [227, 192, 154], hex: '#e3c09a', brand: 'artkal' },
  { id: 'C154', name: 'Sunkissed Teint', nameCN: '阳光肤色', rgb: [197, 139, 96], hex: '#c58b60', brand: 'artkal' },
  { id: 'C155', name: 'Steel Grey', nameCN: '钢灰色', rgb: [90, 95, 101], hex: '#5a5f65', brand: 'artkal' },
  { id: 'C156', name: 'Iron Grey', nameCN: '铁灰色', rgb: [76, 81, 86], hex: '#4c5156', brand: 'artkal' },
  { id: 'C157', name: 'Pepper', nameCN: '胡椒灰', rgb: [58, 62, 66], hex: '#3a3e42', brand: 'artkal' },
  { id: 'C45', name: 'Spring Green', nameCN: '春绿色', rgb: [93, 219, 93], hex: '#5ddb5d', brand: 'artkal' },
  { id: 'C55', name: 'Conifer', nameCN: '针叶绿', rgb: [108, 194, 74], hex: '#6cc24a', brand: 'artkal' },
  { id: 'C57', name: 'Fresh Red', nameCN: '鲜红色', rgb: [188, 4, 35], hex: '#bc0423', brand: 'artkal' },
  { id: 'C59', name: 'Scarlett', nameCN: '猩红色', rgb: [83, 26, 35], hex: '#531a23', brand: 'artkal' },
  { id: 'C61', name: 'Feta', nameCN: '羊奶白', rgb: [241, 235, 156], hex: '#f1eb9c', brand: 'artkal' },
  { id: 'C62', name: 'Carnation', nameCN: '康乃馨红', rgb: [252, 63, 63], hex: '#fc3f3f', brand: 'artkal' },
  { id: 'C63', name: 'Pink Pearl', nameCN: '粉珍珠', rgb: [234, 190, 219], hex: '#eabedb', brand: 'artkal' },
  { id: 'C64', name: 'Rose', nameCN: '玫瑰红', rgb: [165, 0, 80], hex: '#a50050', brand: 'artkal' },
  { id: 'C65', name: 'Mango', nameCN: '芒果色', rgb: [239, 126, 46], hex: '#ef7e2e', brand: 'artkal' },
  { id: 'C66', name: 'Wild Watermelon', nameCN: '野西瓜红', rgb: [252, 108, 133], hex: '#fc6c85', brand: 'artkal' },
  { id: 'C67', name: 'Orchid', nameCN: '兰花紫', rgb: [177, 78, 181], hex: '#b14eb5', brand: 'artkal' },
  { id: 'C68', name: 'Toothpaste Blue', nameCN: '牙膏蓝', rgb: [105, 194, 238], hex: '#69c2ee', brand: 'artkal' },
  { id: 'CE01', name: 'Columbia Blue', nameCN: '哥伦比亚蓝', rgb: [195, 206, 214], hex: '#c3ced6', brand: 'artkal' },
  { id: 'CE02', name: 'Pale Cerulean', nameCN: '浅蔚蓝', rgb: [154, 178, 219], hex: '#9ab2db', brand: 'artkal' },
  { id: 'CE03', name: 'Silver Lake Blue', nameCN: '银湖蓝', rgb: [93, 136, 178], hex: '#5d88b2', brand: 'artkal' },
  { id: 'CE04', name: 'Sky Blue (Crayola)', nameCN: '蜡笔天蓝', rgb: [2, 189, 209], hex: '#02bdd1', brand: 'artkal' },
  { id: 'CE05', name: 'Maximum Blue Green', nameCN: '极致蓝绿', rgb: [82, 202, 172], hex: '#52caac', brand: 'artkal' },
  { id: 'CE06', name: 'Bright Navy Blue', nameCN: '亮海军蓝', rgb: [45, 109, 178], hex: '#2d6db2', brand: 'artkal' },
  { id: 'CE07', name: 'Black Shadows', nameCN: '黑影色', rgb: [194, 163, 183], hex: '#c2a3b7', brand: 'artkal' },
  { id: 'CE08', name: 'Mountbatten Pink', nameCN: '蒙巴顿粉', rgb: [138, 88, 119], hex: '#8a5877', brand: 'artkal' },
  { id: 'CE09', name: 'Halayà Úbe', nameCN: '芋头紫', rgb: [104, 53, 93], hex: '#68355d', brand: 'artkal' },
  { id: 'CE10', name: 'Deep Mauve', nameCN: '深淡紫', rgb: [184, 79, 168], hex: '#b84fa8', brand: 'artkal' },
  { id: 'CE11', name: 'Heliotrope Magenta', nameCN: '天芥菜品红', rgb: [176, 47, 164], hex: '#b02fa4', brand: 'artkal' },
  { id: 'CE12', name: 'Rajah', nameCN: '拉贾橙', rgb: [226, 163, 101], hex: '#e2a365', brand: 'artkal' },
  { id: 'CE13', name: 'Earth Yellow', nameCN: '大地黄', rgb: [190, 142, 89], hex: '#be8e59', brand: 'artkal' },
  { id: 'CE14', name: 'Chinese Bronze', nameCN: '中国青铜', rgb: [168, 116, 67], hex: '#a87443', brand: 'artkal' },
  { id: 'CE15', name: 'Alloy Orange', nameCN: '合金橙', rgb: [160, 110, 82], hex: '#a06e52', brand: 'artkal' },
  { id: 'CE16', name: 'Orchid Pink', nameCN: '兰花粉', rgb: [249, 193, 215], hex: '#f9c1d7', brand: 'artkal' },
  { id: 'CE17', name: 'Caput Mortuum', nameCN: '卡普特红棕', rgb: [89, 41, 43], hex: '#59292b', brand: 'artkal' },
];

// ============ MARD 色板 (中国) - 291色 ============
// 数据来源: https://pixel-beads.com/mard-bead-color-chart
export const mardColors: BeadColor[] = [
  // A系列 - 黄橙色系 (26色)
  { id: 'A1', name: 'A1', nameCN: 'A1', rgb: [250, 244, 200], hex: '#FAF4C8', brand: 'mard' },
  { id: 'A2', name: 'A2', nameCN: 'A2', rgb: [255, 255, 213], hex: '#FFFFD5', brand: 'mard' },
  { id: 'A3', name: 'A3', nameCN: 'A3', rgb: [254, 255, 139], hex: '#FEFF8B', brand: 'mard' },
  { id: 'A4', name: 'A4', nameCN: 'A4', rgb: [251, 237, 86], hex: '#FBED56', brand: 'mard' },
  { id: 'A5', name: 'A5', nameCN: 'A5', rgb: [244, 215, 56], hex: '#F4D738', brand: 'mard' },
  { id: 'A6', name: 'A6', nameCN: 'A6', rgb: [254, 172, 76], hex: '#FEAC4C', brand: 'mard' },
  { id: 'A7', name: 'A7', nameCN: 'A7', rgb: [254, 139, 76], hex: '#FE8B4C', brand: 'mard' },
  { id: 'A8', name: 'A8', nameCN: 'A8', rgb: [255, 218, 69], hex: '#FFDA45', brand: 'mard' },
  { id: 'A9', name: 'A9', nameCN: 'A9', rgb: [255, 153, 91], hex: '#FF995B', brand: 'mard' },
  { id: 'A10', name: 'A10', nameCN: 'A10', rgb: [247, 124, 49], hex: '#F77C31', brand: 'mard' },
  { id: 'A11', name: 'A11', nameCN: 'A11', rgb: [255, 221, 153], hex: '#FFDD99', brand: 'mard' },
  { id: 'A12', name: 'A12', nameCN: 'A12', rgb: [254, 159, 114], hex: '#FE9F72', brand: 'mard' },
  { id: 'A13', name: 'A13', nameCN: 'A13', rgb: [255, 195, 101], hex: '#FFC365', brand: 'mard' },
  { id: 'A14', name: 'A14', nameCN: 'A14', rgb: [253, 84, 61], hex: '#FD543D', brand: 'mard' },
  { id: 'A15', name: 'A15', nameCN: 'A15', rgb: [255, 243, 101], hex: '#FFF365', brand: 'mard' },
  { id: 'A16', name: 'A16', nameCN: 'A16', rgb: [255, 255, 159], hex: '#FFFF9F', brand: 'mard' },
  { id: 'A17', name: 'A17', nameCN: 'A17', rgb: [255, 227, 110], hex: '#FFE36E', brand: 'mard' },
  { id: 'A18', name: 'A18', nameCN: 'A18', rgb: [254, 190, 125], hex: '#FEBE7D', brand: 'mard' },
  { id: 'A19', name: 'A19', nameCN: 'A19', rgb: [253, 124, 114], hex: '#FD7C72', brand: 'mard' },
  { id: 'A20', name: 'A20', nameCN: 'A20', rgb: [255, 213, 104], hex: '#FFD568', brand: 'mard' },
  { id: 'A21', name: 'A21', nameCN: 'A21', rgb: [255, 227, 149], hex: '#FFE395', brand: 'mard' },
  { id: 'A22', name: 'A22', nameCN: 'A22', rgb: [244, 245, 125], hex: '#F4F57D', brand: 'mard' },
  { id: 'A23', name: 'A23', nameCN: 'A23', rgb: [230, 201, 183], hex: '#E6C9B7', brand: 'mard' },
  { id: 'A24', name: 'A24', nameCN: 'A24', rgb: [247, 248, 162], hex: '#F7F8A2', brand: 'mard' },
  { id: 'A25', name: 'A25', nameCN: 'A25', rgb: [255, 214, 125], hex: '#FFD67D', brand: 'mard' },
  { id: 'A26', name: 'A26', nameCN: 'A26', rgb: [255, 200, 48], hex: '#FFC830', brand: 'mard' },
  // B系列 - 绿色系 (32色)
  { id: 'B1', name: 'B1', nameCN: 'B1', rgb: [230, 238, 49], hex: '#E6EE31', brand: 'mard' },
  { id: 'B2', name: 'B2', nameCN: 'B2', rgb: [99, 243, 71], hex: '#63F347', brand: 'mard' },
  { id: 'B3', name: 'B3', nameCN: 'B3', rgb: [158, 247, 128], hex: '#9EF780', brand: 'mard' },
  { id: 'B4', name: 'B4', nameCN: 'B4', rgb: [93, 224, 53], hex: '#5DE035', brand: 'mard' },
  { id: 'B5', name: 'B5', nameCN: 'B5', rgb: [53, 227, 82], hex: '#35E352', brand: 'mard' },
  { id: 'B6', name: 'B6', nameCN: 'B6', rgb: [101, 226, 166], hex: '#65E2A6', brand: 'mard' },
  { id: 'B7', name: 'B7', nameCN: 'B7', rgb: [61, 175, 128], hex: '#3DAF80', brand: 'mard' },
  { id: 'B8', name: 'B8', nameCN: 'B8', rgb: [28, 156, 79], hex: '#1C9C4F', brand: 'mard' },
  { id: 'B9', name: 'B9', nameCN: 'B9', rgb: [39, 82, 58], hex: '#27523A', brand: 'mard' },
  { id: 'B10', name: 'B10', nameCN: 'B10', rgb: [149, 211, 194], hex: '#95D3C2', brand: 'mard' },
  { id: 'B11', name: 'B11', nameCN: 'B11', rgb: [93, 114, 42], hex: '#5D722A', brand: 'mard' },
  { id: 'B12', name: 'B12', nameCN: 'B12', rgb: [22, 111, 65], hex: '#166F41', brand: 'mard' },
  { id: 'B13', name: 'B13', nameCN: 'B13', rgb: [202, 235, 123], hex: '#CAEB7B', brand: 'mard' },
  { id: 'B14', name: 'B14', nameCN: 'B14', rgb: [173, 233, 70], hex: '#ADE946', brand: 'mard' },
  { id: 'B15', name: 'B15', nameCN: 'B15', rgb: [46, 81, 50], hex: '#2E5132', brand: 'mard' },
  { id: 'B16', name: 'B16', nameCN: 'B16', rgb: [197, 237, 156], hex: '#C5ED9C', brand: 'mard' },
  { id: 'B17', name: 'B17', nameCN: 'B17', rgb: [155, 177, 58], hex: '#9BB13A', brand: 'mard' },
  { id: 'B18', name: 'B18', nameCN: 'B18', rgb: [230, 238, 73], hex: '#E6EE49', brand: 'mard' },
  { id: 'B19', name: 'B19', nameCN: 'B19', rgb: [36, 184, 140], hex: '#24B88C', brand: 'mard' },
  { id: 'B20', name: 'B20', nameCN: 'B20', rgb: [194, 240, 204], hex: '#C2F0CC', brand: 'mard' },
  { id: 'B21', name: 'B21', nameCN: 'B21', rgb: [21, 106, 107], hex: '#156A6B', brand: 'mard' },
  { id: 'B22', name: 'B22', nameCN: 'B22', rgb: [11, 60, 67], hex: '#0B3C43', brand: 'mard' },
  { id: 'B23', name: 'B23', nameCN: 'B23', rgb: [48, 58, 33], hex: '#303A21', brand: 'mard' },
  { id: 'B24', name: 'B24', nameCN: 'B24', rgb: [238, 252, 165], hex: '#EEFCA5', brand: 'mard' },
  { id: 'B25', name: 'B25', nameCN: 'B25', rgb: [78, 132, 109], hex: '#4E846D', brand: 'mard' },
  { id: 'B26', name: 'B26', nameCN: 'B26', rgb: [141, 122, 53], hex: '#8D7A35', brand: 'mard' },
  { id: 'B27', name: 'B27', nameCN: 'B27', rgb: [204, 225, 175], hex: '#CCE1AF', brand: 'mard' },
  { id: 'B28', name: 'B28', nameCN: 'B28', rgb: [158, 229, 185], hex: '#9EE5B9', brand: 'mard' },
  { id: 'B29', name: 'B29', nameCN: 'B29', rgb: [197, 226, 84], hex: '#C5E254', brand: 'mard' },
  { id: 'B30', name: 'B30', nameCN: 'B30', rgb: [226, 252, 177], hex: '#E2FCB1', brand: 'mard' },
  { id: 'B31', name: 'B31', nameCN: 'B31', rgb: [176, 231, 146], hex: '#B0E792', brand: 'mard' },
  { id: 'B32', name: 'B32', nameCN: 'B32', rgb: [156, 171, 90], hex: '#9CAB5A', brand: 'mard' },
  // C系列 - 青蓝色系 (29色)
  { id: 'C1', name: 'C1', nameCN: 'C1', rgb: [232, 255, 231], hex: '#E8FFE7', brand: 'mard' },
  { id: 'C2', name: 'C2', nameCN: 'C2', rgb: [169, 249, 252], hex: '#A9F9FC', brand: 'mard' },
  { id: 'C3', name: 'C3', nameCN: 'C3', rgb: [160, 226, 251], hex: '#A0E2FB', brand: 'mard' },
  { id: 'C4', name: 'C4', nameCN: 'C4', rgb: [65, 204, 255], hex: '#41CCFF', brand: 'mard' },
  { id: 'C5', name: 'C5', nameCN: 'C5', rgb: [1, 172, 235], hex: '#01ACEB', brand: 'mard' },
  { id: 'C6', name: 'C6', nameCN: 'C6', rgb: [80, 170, 240], hex: '#50AAF0', brand: 'mard' },
  { id: 'C7', name: 'C7', nameCN: 'C7', rgb: [54, 119, 210], hex: '#3677D2', brand: 'mard' },
  { id: 'C8', name: 'C8', nameCN: 'C8', rgb: [15, 84, 192], hex: '#0F54C0', brand: 'mard' },
  { id: 'C9', name: 'C9', nameCN: 'C9', rgb: [50, 75, 202], hex: '#324BCA', brand: 'mard' },
  { id: 'C10', name: 'C10', nameCN: 'C10', rgb: [62, 188, 226], hex: '#3EBCE2', brand: 'mard' },
  { id: 'C11', name: 'C11', nameCN: 'C11', rgb: [40, 221, 222], hex: '#28DDDE', brand: 'mard' },
  { id: 'C12', name: 'C12', nameCN: 'C12', rgb: [28, 51, 77], hex: '#1C334D', brand: 'mard' },
  { id: 'C13', name: 'C13', nameCN: 'C13', rgb: [205, 232, 255], hex: '#CDE8FF', brand: 'mard' },
  { id: 'C14', name: 'C14', nameCN: 'C14', rgb: [213, 253, 255], hex: '#D5FDFF', brand: 'mard' },
  { id: 'C15', name: 'C15', nameCN: 'C15', rgb: [34, 196, 198], hex: '#22C4C6', brand: 'mard' },
  { id: 'C16', name: 'C16', nameCN: 'C16', rgb: [21, 87, 168], hex: '#1557A8', brand: 'mard' },
  { id: 'C17', name: 'C17', nameCN: 'C17', rgb: [4, 209, 246], hex: '#04D1F6', brand: 'mard' },
  { id: 'C18', name: 'C18', nameCN: 'C18', rgb: [29, 51, 68], hex: '#1D3344', brand: 'mard' },
  { id: 'C19', name: 'C19', nameCN: 'C19', rgb: [24, 135, 162], hex: '#1887A2', brand: 'mard' },
  { id: 'C20', name: 'C20', nameCN: 'C20', rgb: [23, 109, 175], hex: '#176DAF', brand: 'mard' },
  { id: 'C21', name: 'C21', nameCN: 'C21', rgb: [190, 221, 255], hex: '#BEDDFF', brand: 'mard' },
  { id: 'C22', name: 'C22', nameCN: 'C22', rgb: [103, 180, 190], hex: '#67B4BE', brand: 'mard' },
  { id: 'C23', name: 'C23', nameCN: 'C23', rgb: [200, 226, 255], hex: '#C8E2FF', brand: 'mard' },
  { id: 'C24', name: 'C24', nameCN: 'C24', rgb: [124, 196, 255], hex: '#7CC4FF', brand: 'mard' },
  { id: 'C25', name: 'C25', nameCN: 'C25', rgb: [169, 229, 229], hex: '#A9E5E5', brand: 'mard' },
  { id: 'C26', name: 'C26', nameCN: 'C26', rgb: [60, 174, 216], hex: '#3CAED8', brand: 'mard' },
  { id: 'C27', name: 'C27', nameCN: 'C27', rgb: [211, 223, 250], hex: '#D3DFFA', brand: 'mard' },
  { id: 'C28', name: 'C28', nameCN: 'C28', rgb: [187, 207, 237], hex: '#BBCFED', brand: 'mard' },
  { id: 'C29', name: 'C29', nameCN: 'C29', rgb: [52, 72, 142], hex: '#34488E', brand: 'mard' },
  // D系列 - 紫色系 (26色)
  { id: 'D1', name: 'D1', nameCN: 'D1', rgb: [174, 180, 242], hex: '#AEB4F2', brand: 'mard' },
  { id: 'D2', name: 'D2', nameCN: 'D2', rgb: [133, 142, 221], hex: '#858EDD', brand: 'mard' },
  { id: 'D3', name: 'D3', nameCN: 'D3', rgb: [47, 84, 175], hex: '#2F54AF', brand: 'mard' },
  { id: 'D4', name: 'D4', nameCN: 'D4', rgb: [24, 42, 132], hex: '#182A84', brand: 'mard' },
  { id: 'D5', name: 'D5', nameCN: 'D5', rgb: [184, 67, 197], hex: '#B843C5', brand: 'mard' },
  { id: 'D6', name: 'D6', nameCN: 'D6', rgb: [172, 123, 222], hex: '#AC7BDE', brand: 'mard' },
  { id: 'D7', name: 'D7', nameCN: 'D7', rgb: [136, 84, 179], hex: '#8854B3', brand: 'mard' },
  { id: 'D8', name: 'D8', nameCN: 'D8', rgb: [226, 211, 255], hex: '#E2D3FF', brand: 'mard' },
  { id: 'D9', name: 'D9', nameCN: 'D9', rgb: [213, 185, 248], hex: '#D5B9F8', brand: 'mard' },
  { id: 'D10', name: 'D10', nameCN: 'D10', rgb: [54, 24, 81], hex: '#361851', brand: 'mard' },
  { id: 'D11', name: 'D11', nameCN: 'D11', rgb: [185, 186, 225], hex: '#B9BAE1', brand: 'mard' },
  { id: 'D12', name: 'D12', nameCN: 'D12', rgb: [222, 154, 212], hex: '#DE9AD4', brand: 'mard' },
  { id: 'D13', name: 'D13', nameCN: 'D13', rgb: [185, 0, 149], hex: '#B90095', brand: 'mard' },
  { id: 'D14', name: 'D14', nameCN: 'D14', rgb: [139, 39, 155], hex: '#8B279B', brand: 'mard' },
  { id: 'D15', name: 'D15', nameCN: 'D15', rgb: [47, 31, 144], hex: '#2F1F90', brand: 'mard' },
  { id: 'D16', name: 'D16', nameCN: 'D16', rgb: [227, 225, 238], hex: '#E3E1EE', brand: 'mard' },
  { id: 'D17', name: 'D17', nameCN: 'D17', rgb: [196, 212, 246], hex: '#C4D4F6', brand: 'mard' },
  { id: 'D18', name: 'D18', nameCN: 'D18', rgb: [164, 94, 199], hex: '#A45EC7', brand: 'mard' },
  { id: 'D19', name: 'D19', nameCN: 'D19', rgb: [216, 195, 215], hex: '#D8C3D7', brand: 'mard' },
  { id: 'D20', name: 'D20', nameCN: 'D20', rgb: [156, 50, 178], hex: '#9C32B2', brand: 'mard' },
  { id: 'D21', name: 'D21', nameCN: 'D21', rgb: [154, 0, 155], hex: '#9A009B', brand: 'mard' },
  { id: 'D22', name: 'D22', nameCN: 'D22', rgb: [51, 58, 149], hex: '#333A95', brand: 'mard' },
  { id: 'D23', name: 'D23', nameCN: 'D23', rgb: [235, 218, 252], hex: '#EBDAFC', brand: 'mard' },
  { id: 'D24', name: 'D24', nameCN: 'D24', rgb: [119, 134, 229], hex: '#7786E5', brand: 'mard' },
  { id: 'D25', name: 'D25', nameCN: 'D25', rgb: [73, 79, 199], hex: '#494FC7', brand: 'mard' },
  { id: 'D26', name: 'D26', nameCN: 'D26', rgb: [223, 194, 248], hex: '#DFC2F8', brand: 'mard' },
  // E系列 - 粉色系 (24色)
  { id: 'E1', name: 'E1', nameCN: 'E1', rgb: [253, 211, 204], hex: '#FDD3CC', brand: 'mard' },
  { id: 'E2', name: 'E2', nameCN: 'E2', rgb: [254, 192, 223], hex: '#FEC0DF', brand: 'mard' },
  { id: 'E3', name: 'E3', nameCN: 'E3', rgb: [255, 183, 231], hex: '#FFB7E7', brand: 'mard' },
  { id: 'E4', name: 'E4', nameCN: 'E4', rgb: [232, 100, 158], hex: '#E8649E', brand: 'mard' },
  { id: 'E5', name: 'E5', nameCN: 'E5', rgb: [245, 81, 162], hex: '#F551A2', brand: 'mard' },
  { id: 'E6', name: 'E6', nameCN: 'E6', rgb: [241, 61, 116], hex: '#F13D74', brand: 'mard' },
  { id: 'E7', name: 'E7', nameCN: 'E7', rgb: [198, 52, 120], hex: '#C63478', brand: 'mard' },
  { id: 'E8', name: 'E8', nameCN: 'E8', rgb: [255, 219, 233], hex: '#FFDBE9', brand: 'mard' },
  { id: 'E9', name: 'E9', nameCN: 'E9', rgb: [233, 112, 204], hex: '#E970CC', brand: 'mard' },
  { id: 'E10', name: 'E10', nameCN: 'E10', rgb: [211, 55, 147], hex: '#D33793', brand: 'mard' },
  { id: 'E11', name: 'E11', nameCN: 'E11', rgb: [252, 221, 210], hex: '#FCDDD2', brand: 'mard' },
  { id: 'E12', name: 'E12', nameCN: 'E12', rgb: [247, 143, 195], hex: '#F78FC3', brand: 'mard' },
  { id: 'E13', name: 'E13', nameCN: 'E13', rgb: [181, 0, 109], hex: '#B5006D', brand: 'mard' },
  { id: 'E14', name: 'E14', nameCN: 'E14', rgb: [255, 209, 186], hex: '#FFD1BA', brand: 'mard' },
  { id: 'E15', name: 'E15', nameCN: 'E15', rgb: [248, 199, 201], hex: '#F8C7C9', brand: 'mard' },
  { id: 'E16', name: 'E16', nameCN: 'E16', rgb: [255, 243, 235], hex: '#FFF3EB', brand: 'mard' },
  { id: 'E17', name: 'E17', nameCN: 'E17', rgb: [255, 226, 234], hex: '#FFE2EA', brand: 'mard' },
  { id: 'E18', name: 'E18', nameCN: 'E18', rgb: [255, 199, 219], hex: '#FFC7DB', brand: 'mard' },
  { id: 'E19', name: 'E19', nameCN: 'E19', rgb: [254, 186, 213], hex: '#FEBAD5', brand: 'mard' },
  { id: 'E20', name: 'E20', nameCN: 'E20', rgb: [216, 199, 209], hex: '#D8C7D1', brand: 'mard' },
  { id: 'E21', name: 'E21', nameCN: 'E21', rgb: [189, 157, 161], hex: '#BD9DA1', brand: 'mard' },
  { id: 'E22', name: 'E22', nameCN: 'E22', rgb: [183, 133, 161], hex: '#B785A1', brand: 'mard' },
  { id: 'E23', name: 'E23', nameCN: 'E23', rgb: [147, 122, 141], hex: '#937A8D', brand: 'mard' },
  { id: 'E24', name: 'E24', nameCN: 'E24', rgb: [225, 188, 232], hex: '#E1BCE8', brand: 'mard' },
  // F系列 - 红色系 (25色)
  { id: 'F1', name: 'F1', nameCN: 'F1', rgb: [253, 149, 123], hex: '#FD957B', brand: 'mard' },
  { id: 'F2', name: 'F2', nameCN: 'F2', rgb: [252, 61, 70], hex: '#FC3D46', brand: 'mard' },
  { id: 'F3', name: 'F3', nameCN: 'F3', rgb: [247, 73, 65], hex: '#F74941', brand: 'mard' },
  { id: 'F4', name: 'F4', nameCN: 'F4', rgb: [252, 40, 60], hex: '#FC283C', brand: 'mard' },
  { id: 'F5', name: 'F5', nameCN: 'F5', rgb: [231, 0, 47], hex: '#E7002F', brand: 'mard' },
  { id: 'F6', name: 'F6', nameCN: 'F6', rgb: [148, 54, 48], hex: '#943630', brand: 'mard' },
  { id: 'F7', name: 'F7', nameCN: 'F7', rgb: [151, 25, 55], hex: '#971937', brand: 'mard' },
  { id: 'F8', name: 'F8', nameCN: 'F8', rgb: [188, 0, 40], hex: '#BC0028', brand: 'mard' },
  { id: 'F9', name: 'F9', nameCN: 'F9', rgb: [226, 103, 122], hex: '#E2677A', brand: 'mard' },
  { id: 'F10', name: 'F10', nameCN: 'F10', rgb: [138, 69, 38], hex: '#8A4526', brand: 'mard' },
  { id: 'F11', name: 'F11', nameCN: 'F11', rgb: [90, 33, 33], hex: '#5A2121', brand: 'mard' },
  { id: 'F12', name: 'F12', nameCN: 'F12', rgb: [253, 78, 106], hex: '#FD4E6A', brand: 'mard' },
  { id: 'F13', name: 'F13', nameCN: 'F13', rgb: [243, 87, 68], hex: '#F35744', brand: 'mard' },
  { id: 'F14', name: 'F14', nameCN: 'F14', rgb: [255, 169, 173], hex: '#FFA9AD', brand: 'mard' },
  { id: 'F15', name: 'F15', nameCN: 'F15', rgb: [211, 0, 34], hex: '#D30022', brand: 'mard' },
  { id: 'F16', name: 'F16', nameCN: 'F16', rgb: [254, 194, 166], hex: '#FEC2A6', brand: 'mard' },
  { id: 'F17', name: 'F17', nameCN: 'F17', rgb: [230, 156, 121], hex: '#E69C79', brand: 'mard' },
  { id: 'F18', name: 'F18', nameCN: 'F18', rgb: [211, 124, 70], hex: '#D37C46', brand: 'mard' },
  { id: 'F19', name: 'F19', nameCN: 'F19', rgb: [193, 68, 74], hex: '#C1444A', brand: 'mard' },
  { id: 'F20', name: 'F20', nameCN: 'F20', rgb: [205, 147, 145], hex: '#CD9391', brand: 'mard' },
  { id: 'F21', name: 'F21', nameCN: 'F21', rgb: [247, 180, 198], hex: '#F7B4C6', brand: 'mard' },
  { id: 'F22', name: 'F22', nameCN: 'F22', rgb: [253, 192, 208], hex: '#FDC0D0', brand: 'mard' },
  { id: 'F23', name: 'F23', nameCN: 'F23', rgb: [246, 126, 102], hex: '#F67E66', brand: 'mard' },
  { id: 'F24', name: 'F24', nameCN: 'F24', rgb: [230, 152, 170], hex: '#E698AA', brand: 'mard' },
  { id: 'F25', name: 'F25', nameCN: 'F25', rgb: [229, 75, 79], hex: '#E54B4F', brand: 'mard' },
  // G系列 - 棕色肤色系 (21色)
  { id: 'G1', name: 'G1', nameCN: 'G1', rgb: [255, 226, 206], hex: '#FFE2CE', brand: 'mard' },
  { id: 'G2', name: 'G2', nameCN: 'G2', rgb: [255, 196, 170], hex: '#FFC4AA', brand: 'mard' },
  { id: 'G3', name: 'G3', nameCN: 'G3', rgb: [244, 195, 165], hex: '#F4C3A5', brand: 'mard' },
  { id: 'G4', name: 'G4', nameCN: 'G4', rgb: [225, 179, 131], hex: '#E1B383', brand: 'mard' },
  { id: 'G5', name: 'G5', nameCN: 'G5', rgb: [237, 176, 69], hex: '#EDB045', brand: 'mard' },
  { id: 'G6', name: 'G6', nameCN: 'G6', rgb: [233, 156, 23], hex: '#E99C17', brand: 'mard' },
  { id: 'G7', name: 'G7', nameCN: 'G7', rgb: [157, 91, 62], hex: '#9D5B3E', brand: 'mard' },
  { id: 'G8', name: 'G8', nameCN: 'G8', rgb: [117, 56, 50], hex: '#753832', brand: 'mard' },
  { id: 'G9', name: 'G9', nameCN: 'G9', rgb: [230, 180, 131], hex: '#E6B483', brand: 'mard' },
  { id: 'G10', name: 'G10', nameCN: 'G10', rgb: [217, 140, 57], hex: '#D98C39', brand: 'mard' },
  { id: 'G11', name: 'G11', nameCN: 'G11', rgb: [224, 197, 147], hex: '#E0C593', brand: 'mard' },
  { id: 'G12', name: 'G12', nameCN: 'G12', rgb: [255, 200, 144], hex: '#FFC890', brand: 'mard' },
  { id: 'G13', name: 'G13', nameCN: 'G13', rgb: [183, 113, 74], hex: '#B7714A', brand: 'mard' },
  { id: 'G14', name: 'G14', nameCN: 'G14', rgb: [141, 97, 76], hex: '#8D614C', brand: 'mard' },
  { id: 'G15', name: 'G15', nameCN: 'G15', rgb: [252, 249, 224], hex: '#FCF9E0', brand: 'mard' },
  { id: 'G16', name: 'G16', nameCN: 'G16', rgb: [242, 217, 186], hex: '#F2D9BA', brand: 'mard' },
  { id: 'G17', name: 'G17', nameCN: 'G17', rgb: [120, 82, 75], hex: '#78524B', brand: 'mard' },
  { id: 'G18', name: 'G18', nameCN: 'G18', rgb: [255, 228, 204], hex: '#FFE4CC', brand: 'mard' },
  { id: 'G19', name: 'G19', nameCN: 'G19', rgb: [224, 121, 53], hex: '#E07935', brand: 'mard' },
  { id: 'G20', name: 'G20', nameCN: 'G20', rgb: [169, 64, 35], hex: '#A94023', brand: 'mard' },
  { id: 'G21', name: 'G21', nameCN: 'G21', rgb: [184, 133, 88], hex: '#B88558', brand: 'mard' },
  // H系列 - 黑白灰色系 (23色)
  { id: 'H1', name: 'H1', nameCN: 'H1', rgb: [253, 251, 255], hex: '#FDFBFF', brand: 'mard' },
  { id: 'H2', name: 'H2', nameCN: 'H2', rgb: [254, 255, 255], hex: '#FEFFFF', brand: 'mard' },
  { id: 'H3', name: 'H3', nameCN: 'H3', rgb: [182, 177, 186], hex: '#B6B1BA', brand: 'mard' },
  { id: 'H4', name: 'H4', nameCN: 'H4', rgb: [137, 133, 140], hex: '#89858C', brand: 'mard' },
  { id: 'H5', name: 'H5', nameCN: 'H5', rgb: [72, 70, 78], hex: '#48464E', brand: 'mard' },
  { id: 'H6', name: 'H6', nameCN: 'H6', rgb: [47, 43, 47], hex: '#2F2B2F', brand: 'mard' },
  { id: 'H7', name: 'H7', nameCN: 'H7', rgb: [0, 0, 0], hex: '#000000', brand: 'mard' },
  { id: 'H8', name: 'H8', nameCN: 'H8', rgb: [231, 214, 219], hex: '#E7D6DB', brand: 'mard' },
  { id: 'H9', name: 'H9', nameCN: 'H9', rgb: [237, 237, 237], hex: '#EDEDED', brand: 'mard' },
  { id: 'H10', name: 'H10', nameCN: 'H10', rgb: [238, 233, 234], hex: '#EEE9EA', brand: 'mard' },
  { id: 'H11', name: 'H11', nameCN: 'H11', rgb: [206, 205, 213], hex: '#CECDD5', brand: 'mard' },
  { id: 'H12', name: 'H12', nameCN: 'H12', rgb: [255, 245, 237], hex: '#FFF5ED', brand: 'mard' },
  { id: 'H13', name: 'H13', nameCN: 'H13', rgb: [245, 236, 210], hex: '#F5ECD2', brand: 'mard' },
  { id: 'H14', name: 'H14', nameCN: 'H14', rgb: [207, 215, 211], hex: '#CFD7D3', brand: 'mard' },
  { id: 'H15', name: 'H15', nameCN: 'H15', rgb: [152, 166, 168], hex: '#98A6A8', brand: 'mard' },
  { id: 'H16', name: 'H16', nameCN: 'H16', rgb: [29, 20, 20], hex: '#1D1414', brand: 'mard' },
  { id: 'H17', name: 'H17', nameCN: 'H17', rgb: [241, 237, 237], hex: '#F1EDED', brand: 'mard' },
  { id: 'H18', name: 'H18', nameCN: 'H18', rgb: [255, 253, 240], hex: '#FFFDF0', brand: 'mard' },
  { id: 'H19', name: 'H19', nameCN: 'H19', rgb: [246, 239, 226], hex: '#F6EFE2', brand: 'mard' },
  { id: 'H20', name: 'H20', nameCN: 'H20', rgb: [148, 159, 163], hex: '#949FA3', brand: 'mard' },
  { id: 'H21', name: 'H21', nameCN: 'H21', rgb: [255, 251, 225], hex: '#FFFBE1', brand: 'mard' },
  { id: 'H22', name: 'H22', nameCN: 'H22', rgb: [202, 202, 212], hex: '#CACAD4', brand: 'mard' },
  { id: 'H23', name: 'H23', nameCN: 'H23', rgb: [154, 157, 148], hex: '#9A9D94', brand: 'mard' },
  // M系列 - 莫兰迪色系 (15色)
  { id: 'M1', name: 'M1', nameCN: 'M1', rgb: [188, 198, 184], hex: '#BCC6B8', brand: 'mard' },
  { id: 'M2', name: 'M2', nameCN: 'M2', rgb: [138, 163, 134], hex: '#8AA386', brand: 'mard' },
  { id: 'M3', name: 'M3', nameCN: 'M3', rgb: [105, 125, 128], hex: '#697D80', brand: 'mard' },
  { id: 'M4', name: 'M4', nameCN: 'M4', rgb: [227, 210, 188], hex: '#E3D2BC', brand: 'mard' },
  { id: 'M5', name: 'M5', nameCN: 'M5', rgb: [208, 204, 170], hex: '#D0CCAA', brand: 'mard' },
  { id: 'M6', name: 'M6', nameCN: 'M6', rgb: [176, 167, 130], hex: '#B0A782', brand: 'mard' },
  { id: 'M7', name: 'M7', nameCN: 'M7', rgb: [180, 164, 151], hex: '#B4A497', brand: 'mard' },
  { id: 'M8', name: 'M8', nameCN: 'M8', rgb: [179, 130, 129], hex: '#B38281', brand: 'mard' },
  { id: 'M9', name: 'M9', nameCN: 'M9', rgb: [165, 135, 103], hex: '#A58767', brand: 'mard' },
  { id: 'M10', name: 'M10', nameCN: 'M10', rgb: [197, 178, 188], hex: '#C5B2BC', brand: 'mard' },
  { id: 'M11', name: 'M11', nameCN: 'M11', rgb: [159, 117, 148], hex: '#9F7594', brand: 'mard' },
  { id: 'M12', name: 'M12', nameCN: 'M12', rgb: [100, 71, 73], hex: '#644749', brand: 'mard' },
  { id: 'M13', name: 'M13', nameCN: 'M13', rgb: [209, 144, 102], hex: '#D19066', brand: 'mard' },
  { id: 'M14', name: 'M14', nameCN: 'M14', rgb: [199, 115, 98], hex: '#C77362', brand: 'mard' },
  { id: 'M15', name: 'M15', nameCN: 'M15', rgb: [117, 125, 120], hex: '#757D78', brand: 'mard' },
  // P系列 - 粉彩系 (23色)
  { id: 'P1', name: 'P1', nameCN: 'P1', rgb: [252, 247, 248], hex: '#FCF7F8', brand: 'mard' },
  { id: 'P2', name: 'P2', nameCN: 'P2', rgb: [176, 169, 172], hex: '#B0A9AC', brand: 'mard' },
  { id: 'P3', name: 'P3', nameCN: 'P3', rgb: [175, 220, 171], hex: '#AFDCAB', brand: 'mard' },
  { id: 'P4', name: 'P4', nameCN: 'P4', rgb: [254, 164, 159], hex: '#FEA49F', brand: 'mard' },
  { id: 'P5', name: 'P5', nameCN: 'P5', rgb: [238, 140, 62], hex: '#EE8C3E', brand: 'mard' },
  { id: 'P6', name: 'P6', nameCN: 'P6', rgb: [95, 208, 167], hex: '#5FD0A7', brand: 'mard' },
  { id: 'P7', name: 'P7', nameCN: 'P7', rgb: [235, 146, 112], hex: '#EB9270', brand: 'mard' },
  { id: 'P8', name: 'P8', nameCN: 'P8', rgb: [240, 217, 88], hex: '#F0D958', brand: 'mard' },
  { id: 'P9', name: 'P9', nameCN: 'P9', rgb: [217, 217, 217], hex: '#D9D9D9', brand: 'mard' },
  { id: 'P10', name: 'P10', nameCN: 'P10', rgb: [217, 199, 234], hex: '#D9C7EA', brand: 'mard' },
  { id: 'P11', name: 'P11', nameCN: 'P11', rgb: [243, 236, 201], hex: '#F3ECC9', brand: 'mard' },
  { id: 'P12', name: 'P12', nameCN: 'P12', rgb: [230, 238, 242], hex: '#E6EEF2', brand: 'mard' },
  { id: 'P13', name: 'P13', nameCN: 'P13', rgb: [170, 203, 239], hex: '#AACBEF', brand: 'mard' },
  { id: 'P14', name: 'P14', nameCN: 'P14', rgb: [51, 118, 128], hex: '#337680', brand: 'mard' },
  { id: 'P15', name: 'P15', nameCN: 'P15', rgb: [102, 133, 117], hex: '#668575', brand: 'mard' },
  { id: 'P16', name: 'P16', nameCN: 'P16', rgb: [254, 191, 69], hex: '#FEBF45', brand: 'mard' },
  { id: 'P17', name: 'P17', nameCN: 'P17', rgb: [254, 163, 36], hex: '#FEA324', brand: 'mard' },
  { id: 'P18', name: 'P18', nameCN: 'P18', rgb: [254, 184, 159], hex: '#FEB89F', brand: 'mard' },
  { id: 'P19', name: 'P19', nameCN: 'P19', rgb: [255, 254, 236], hex: '#FFFEEC', brand: 'mard' },
  { id: 'P20', name: 'P20', nameCN: 'P20', rgb: [254, 190, 207], hex: '#FEBECF', brand: 'mard' },
  { id: 'P21', name: 'P21', nameCN: 'P21', rgb: [236, 190, 191], hex: '#ECBEBF', brand: 'mard' },
  { id: 'P22', name: 'P22', nameCN: 'P22', rgb: [228, 168, 159], hex: '#E4A89F', brand: 'mard' },
  { id: 'P23', name: 'P23', nameCN: 'P23', rgb: [165, 98, 104], hex: '#A56268', brand: 'mard' },
  // Q系列 - 荧光色系 (5色)
  { id: 'Q1', name: 'Q1', nameCN: 'Q1', rgb: [242, 165, 232], hex: '#F2A5E8', brand: 'mard' },
  { id: 'Q2', name: 'Q2', nameCN: 'Q2', rgb: [233, 236, 145], hex: '#E9EC91', brand: 'mard' },
  { id: 'Q3', name: 'Q3', nameCN: 'Q3', rgb: [255, 255, 0], hex: '#FFFF00', brand: 'mard' },
  { id: 'Q4', name: 'Q4', nameCN: 'Q4', rgb: [255, 235, 250], hex: '#FFEBFA', brand: 'mard' },
  { id: 'Q5', name: 'Q5', nameCN: 'Q5', rgb: [118, 206, 222], hex: '#76CEDE', brand: 'mard' },
  // R系列 - 新色系 (28色)
  { id: 'R1', name: 'R1', nameCN: 'R1', rgb: [213, 13, 33], hex: '#D50D21', brand: 'mard' },
  { id: 'R2', name: 'R2', nameCN: 'R2', rgb: [249, 47, 131], hex: '#F92F83', brand: 'mard' },
  { id: 'R3', name: 'R3', nameCN: 'R3', rgb: [253, 131, 36], hex: '#FD8324', brand: 'mard' },
  { id: 'R4', name: 'R4', nameCN: 'R4', rgb: [248, 236, 49], hex: '#F8EC31', brand: 'mard' },
  { id: 'R5', name: 'R5', nameCN: 'R5', rgb: [53, 199, 91], hex: '#35C75B', brand: 'mard' },
  { id: 'R6', name: 'R6', nameCN: 'R6', rgb: [35, 136, 145], hex: '#238891', brand: 'mard' },
  { id: 'R7', name: 'R7', nameCN: 'R7', rgb: [25, 119, 157], hex: '#19779D', brand: 'mard' },
  { id: 'R8', name: 'R8', nameCN: 'R8', rgb: [26, 96, 195], hex: '#1A60C3', brand: 'mard' },
  { id: 'R9', name: 'R9', nameCN: 'R9', rgb: [154, 86, 180], hex: '#9A56B4', brand: 'mard' },
  { id: 'R10', name: 'R10', nameCN: 'R10', rgb: [255, 219, 76], hex: '#FFDB4C', brand: 'mard' },
  { id: 'R11', name: 'R11', nameCN: 'R11', rgb: [255, 235, 250], hex: '#FFEBFA', brand: 'mard' },
  { id: 'R12', name: 'R12', nameCN: 'R12', rgb: [216, 213, 206], hex: '#D8D5CE', brand: 'mard' },
  { id: 'R13', name: 'R13', nameCN: 'R13', rgb: [85, 81, 76], hex: '#55514C', brand: 'mard' },
  { id: 'R14', name: 'R14', nameCN: 'R14', rgb: [159, 228, 223], hex: '#9FE4DF', brand: 'mard' },
  { id: 'R15', name: 'R15', nameCN: 'R15', rgb: [119, 206, 233], hex: '#77CEE9', brand: 'mard' },
  { id: 'R16', name: 'R16', nameCN: 'R16', rgb: [62, 207, 202], hex: '#3ECFCA', brand: 'mard' },
  { id: 'R17', name: 'R17', nameCN: 'R17', rgb: [74, 134, 122], hex: '#4A867A', brand: 'mard' },
  { id: 'R18', name: 'R18', nameCN: 'R18', rgb: [127, 205, 157], hex: '#7FCD9D', brand: 'mard' },
  { id: 'R19', name: 'R19', nameCN: 'R19', rgb: [205, 229, 93], hex: '#CDE55D', brand: 'mard' },
  { id: 'R20', name: 'R20', nameCN: 'R20', rgb: [232, 199, 180], hex: '#E8C7B4', brand: 'mard' },
  { id: 'R21', name: 'R21', nameCN: 'R21', rgb: [173, 111, 60], hex: '#AD6F3C', brand: 'mard' },
  { id: 'R22', name: 'R22', nameCN: 'R22', rgb: [108, 55, 47], hex: '#6C372F', brand: 'mard' },
  { id: 'R23', name: 'R23', nameCN: 'R23', rgb: [254, 184, 114], hex: '#FEB872', brand: 'mard' },
  { id: 'R24', name: 'R24', nameCN: 'R24', rgb: [243, 193, 192], hex: '#F3C1C0', brand: 'mard' },
  { id: 'R25', name: 'R25', nameCN: 'R25', rgb: [201, 103, 94], hex: '#C9675E', brand: 'mard' },
  { id: 'R26', name: 'R26', nameCN: 'R26', rgb: [210, 147, 190], hex: '#D293BE', brand: 'mard' },
  { id: 'R27', name: 'R27', nameCN: 'R27', rgb: [234, 140, 177], hex: '#EA8CB1', brand: 'mard' },
  { id: 'R28', name: 'R28', nameCN: 'R28', rgb: [156, 135, 214], hex: '#9C87D6', brand: 'mard' },
  // T系列 - 透明色 (1色)
  { id: 'T1', name: 'T1', nameCN: 'T1', rgb: [255, 255, 255], hex: '#FFFFFF', brand: 'mard' },
  // Y系列 - 夜光色 (5色)
  { id: 'Y1', name: 'Y1', nameCN: 'Y1', rgb: [253, 111, 180], hex: '#FD6FB4', brand: 'mard' },
  { id: 'Y2', name: 'Y2', nameCN: 'Y2', rgb: [254, 180, 129], hex: '#FEB481', brand: 'mard' },
  { id: 'Y3', name: 'Y3', nameCN: 'Y3', rgb: [215, 250, 160], hex: '#D7FAA0', brand: 'mard' },
  { id: 'Y4', name: 'Y4', nameCN: 'Y4', rgb: [139, 219, 250], hex: '#8BDBFA', brand: 'mard' },
  { id: 'Y5', name: 'Y5', nameCN: 'Y5', rgb: [233, 135, 234], hex: '#E987EA', brand: 'mard' },
  // ZG系列 - 中灰色系 (8色)
  { id: 'ZG1', name: 'ZG1', nameCN: 'ZG1', rgb: [218, 171, 179], hex: '#DAABB3', brand: 'mard' },
  { id: 'ZG2', name: 'ZG2', nameCN: 'ZG2', rgb: [214, 170, 135], hex: '#D6AA87', brand: 'mard' },
  { id: 'ZG3', name: 'ZG3', nameCN: 'ZG3', rgb: [193, 189, 141], hex: '#C1BD8D', brand: 'mard' },
  { id: 'ZG4', name: 'ZG4', nameCN: 'ZG4', rgb: [150, 134, 159], hex: '#96869F', brand: 'mard' },
  { id: 'ZG5', name: 'ZG5', nameCN: 'ZG5', rgb: [132, 144, 166], hex: '#8490A6', brand: 'mard' },
  { id: 'ZG6', name: 'ZG6', nameCN: 'ZG6', rgb: [148, 191, 226], hex: '#94BFE2', brand: 'mard' },
  { id: 'ZG7', name: 'ZG7', nameCN: 'ZG7', rgb: [226, 169, 210], hex: '#E2A9D2', brand: 'mard' },
  { id: 'ZG8', name: 'ZG8', nameCN: 'ZG8', rgb: [171, 145, 192], hex: '#AB91C0', brand: 'mard' },
];

// 所有颜色合并 - 使用 MARD（国内最主流拼豆品牌，291色）
export const allBeadColors: BeadColor[] = [
  ...mardColors,
];

// 按品牌获取颜色
export const getColorsByBrand = (brand: 'perler' | 'hama' | 'artkal' | 'mard'): BeadColor[] => {
  switch (brand) {
    case 'perler':
      return perlerColors;
    case 'hama':
      return hamaColors;
    case 'artkal':
      return artkalColors;
    case 'mard':
      return mardColors;
    default:
      return allBeadColors;
  }
};

// 计算两个颜色的欧氏距离
export const colorDistance = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number => {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
};

// 颜色数量选项
export interface ColorCountOption {
  count: number;
  label: string;
  description: string;
  detailDesc: string;
  icon: string;
  recommended?: boolean;
}

// 颜色数量选项 - 基于 MARD 291色
export const colorCountOptions: ColorCountOption[] = [
  { count: 48, label: '48色', description: '极简风格', detailDesc: '卡通、简笔画', icon: '🎨', },
  { count: 72, label: '72色', description: '基础配色', detailDesc: '像素画、图标', icon: '🖼️', },
  { count: 96, label: '96色', description: '细腻表现', detailDesc: '风景、插画', icon: '🌈', },
  { count: 150, label: '150色', description: '精细还原', detailDesc: '人物、照片', icon: '✨', recommended: true },
  { count: 200, label: '200色', description: '色彩丰富', detailDesc: '高精度还原', icon: '💎', },
  { count: 291, label: '全部', description: '当前系统全部颜色', detailDesc: '', icon: '🏆', },
];

export const defaultColorCount = 150;

export const mard221Colors: BeadColor[] = mardColors.slice(0, 221);

export type PaletteMode = 'mard-221' | 'mard-291' | 'my-colors';

export interface OfficialPaletteOption {
  id: 'mard-221' | 'mard-291';
  label: string;
  description: string;
  colors: BeadColor[];
}

export interface ColorLimitOption {
  id: string;
  count: number;
  label: string;
  description: string;
  detailDesc: string;
  icon: string;
  recommended?: boolean;
}

export interface PaletteSelectionInput {
  paletteMode?: PaletteMode | string | null;
  colorLimit?: number | null;
  colorCount?: number | null;
  customColorIds?: readonly string[] | null;
  myColorCount?: number | null;
}

export interface NormalizedPaletteSelection {
  paletteMode: PaletteMode;
  colorLimit: number;
}

const normalizeColorLimit = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

export const officialPaletteOptions: OfficialPaletteOption[] = [
  {
    id: 'mard-221',
    label: 'MARD 221 常用色',
    description: '精简且稳定的官方常用色库',
    colors: mard221Colors,
  },
  {
    id: 'mard-291',
    label: 'MARD 291 全色',
    description: '完整官方色库',
    colors: mardColors,
  },
];

export const colorLimitOptions: ColorLimitOption[] = [
  { id: 'limit-48', count: 48, label: '最多 48 色', description: '极简风格', detailDesc: '卡通、简笔画', icon: '🚀' },
  { id: 'limit-72', count: 72, label: '最多 72 色', description: '基础配色', detailDesc: '像素画、图标', icon: '🖼️' },
  { id: 'limit-96', count: 96, label: '最多 96 色', description: '细腻表现', detailDesc: '风景、插画', icon: '🌈' },
  { id: 'limit-150', count: 150, label: '最多 150 色', description: '精细还原', detailDesc: '人物、照片', icon: '✅', recommended: true },
  { id: 'limit-200', count: 200, label: '最多 200 色', description: '色彩丰富', detailDesc: '高精度还原', icon: '🧵' },
  { id: 'limit-291', count: 291, label: '不限制', description: '使用当前基础色库全部颜色', detailDesc: '', icon: '🏳' },
];

export const normalizePaletteSelection = (
  selection: PaletteSelectionInput = {},
): NormalizedPaletteSelection => {
  const hasCustomColors = (selection.myColorCount ?? selection.customColorIds?.length ?? 0) > 0;
  const nextColorLimit = normalizeColorLimit(
    selection.colorLimit ?? selection.colorCount,
    defaultColorCount,
  );

  if (selection.paletteMode === 'my-colors' && hasCustomColors) {
    return {
      paletteMode: 'my-colors',
      colorLimit: nextColorLimit,
    };
  }

  if (selection.paletteMode === 'mard-221' || selection.paletteMode === 'mard-291') {
    return {
      paletteMode: selection.paletteMode,
      colorLimit: nextColorLimit,
    };
  }

  return {
    paletteMode: 'mard-291',
    colorLimit: nextColorLimit,
  };
};

export const clampColorLimitByPaletteSize = (
  paletteMode: PaletteMode,
  colorLimit: number,
  myColorCount: number,
): number => {
  const nextColorLimit = normalizeColorLimit(colorLimit, defaultColorCount);
  const nextMyColorCount = Math.max(0, Math.round(myColorCount || 0));

  if (paletteMode === 'mard-221') {
    return Math.min(nextColorLimit, mard221Colors.length);
  }

  if (paletteMode === 'mard-291') {
    return Math.min(nextColorLimit, mardColors.length);
  }

  return Math.min(nextColorLimit, nextMyColorCount);
};

export const getPaletteColorsForMode = (
  paletteMode: PaletteMode,
  customColorIds: readonly string[] = [],
): BeadColor[] => {
  if (paletteMode === 'mard-221') {
    return mard221Colors;
  }

  if (paletteMode === 'mard-291') {
    return mardColors;
  }

  if (customColorIds.length === 0) {
    return [];
  }

  const selectedIds = new Set(customColorIds);
  return mardColors.filter((color) => selectedIds.has(color.id));
};
