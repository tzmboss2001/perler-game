import React, { useState, useEffect, useRef, useCallback } from 'react';

import { ArrowLeft, GridFour, Palette, ListBullets, ArrowClockwise, ArrowCounterClockwise, Play, PencilSimple, ArrowsClockwise, ShareNetwork, ShoppingCart, Prohibit, CheckCircle } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';

import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';

import { pixelizeImage, PixelData } from '../../services/pixelizeService';

import { matchPixelsToBead, calculateBeadStatistics, renderBeadsToCanvas, BeadPixelData, BeadStatistics, replaceColor, findNextSimilarColor, reduceColors, smartMergeColors } from '../../services/colorMatchService';

import SmartMergeModal from '../../components/SmartMergeModal';

import { colorCountOptions, defaultColorCount, allBeadColors, BeadColor } from '../../data/beadColors';

import { useEditorStore, EditorTool } from '../../store/editorStore';

import EditorToolbar from '../../components/EditorToolbar';

import ColorPicker from '../../components/ColorPicker';

import InteractiveCanvas, { InteractiveCanvasHandle } from '../../components/InteractiveCanvas';
import SaveProjectModal from '../../components/SaveProjectModal';

import ShareModal from '../../components/ShareModal';

import ShoppingListModal from '../../components/ShoppingListModal';

import LoginModal from '../../components/LoginModal';

import MyColorsModal from '../../components/MyColorsModal';
import RewardedUnlockModal from '../../components/ads/RewardedUnlockModal';

import { useUserStore } from '../../store/userStore';

import { projectApi } from '../../services/api/projectApi';

import { uploadApi } from '../../services/api/uploadApi';

import { useToast } from '../../components/Toast';

import Modal, { useModal } from '../../components/Modal';

import { localStorageService } from '../../services/localStorageService';

import { recommendBoard } from '../../services/boardService';
import { adService } from '../../services/adService';

import { myColorsService } from '../../services/myColorsService';
import { applyTransparentIndices, suggestQuickBackgroundRemoval } from '../../services/backgroundRemovalService';
import { getAiCutoutAvailability, requestAiCutout } from '../../services/aiCutoutService';



/**
 * 移动端编辑图案页面。
 * 支持预览、调参、色系设置、豆子统计、局部编辑、背景处理和智能抠图。
 */

export interface EditorStateData {

  imageData?: string;

  colorCount?: number;

  gridWidth?: number;

  customColorIds?: string[];

}

type RemovedBackgroundCell = {
  index: number;
  bead: NonNullable<BeadPixelData['beads'][number]>;
};

type BackgroundEditMode = 'select' | 'view' | 'erase' | 'restore';



interface EditorPageProps {

  embeddedStateData?: EditorStateData;

  onBack?: () => void;

}

const GRID_SIZE_MIN = 10;

const GRID_SIZE_MAX = 200;

const GRID_SIZE_STEP = 2;

const COMMON_BOARD_WIDTHS = [54, 78, 104];

const SATURATION_PRESETS = [

  { label: '原图', value: 0 },

  { label: '推荐', value: 8 },

  { label: '鲜亮', value: 16 },

];

const normalizeGridSize = (value: number) => {

  const safeValue = Number.isFinite(value) ? value : 52;

  const clamped = Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, Math.round(safeValue)));

  const snapped = Math.round(clamped / GRID_SIZE_STEP) * GRID_SIZE_STEP;

  return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, snapped));

};



const EditorPage: React.FC<EditorPageProps> = ({ embeddedStateData, onBack }) => {

  const navigate = useNavigate();

  const location = useLocation();

  const toast = useToast();

  const { isLoggedIn, initUser } = useUserStore();

  const { modalProps, showAlert, showConfirm } = useModal();

  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const interactiveCanvasRef = useRef<InteractiveCanvasHandle>(null);

  const savedScrollPosition = useRef<number>(0);

  const initializedImageDataRef = useRef<string | undefined>(undefined);




  const stateData: EditorStateData = (location.state as EditorStateData) || {};

  const sessionData = React.useMemo<EditorStateData>(() => {

    try {

      const stored = sessionStorage.getItem('editorData');

      if (stored) {

        sessionStorage.removeItem('editorData');

        return JSON.parse(stored);

      }

    } catch (e) {}

    return {};

  }, []);

  const mergedStateData = embeddedStateData ?? (stateData.imageData ? stateData : sessionData);

  const { imageData, colorCount: initialColorCount, gridWidth: initialGridWidth, customColorIds } = mergedStateData;



  const [gridSize, setGridSize] = useState(normalizeGridSize(initialGridWidth || 52));
  const [currentImageData, setCurrentImageData] = useState(imageData);
  const [lastAiCutoutImageData, setLastAiCutoutImageData] = useState<string | null>(null);

  const [gridSizeInput, setGridSizeInput] = useState(String(normalizeGridSize(initialGridWidth || 52)));

  const [colorCount, setColorCount] = useState<number>(initialColorCount || defaultColorCount);

  const [simplifyLevel, setSimplifyLevel] = useState<number>(0);

  const [saturationBoost, setSaturationBoost] = useState<number>(0);

  const [vibrancyPreference, setVibrancyPreference] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState(false);

  const [showStats, setShowStats] = useState(false);

  const [showColorPicker, setShowColorPicker] = useState(false);

  const [showPaletteSettings, setShowPaletteSettings] = useState(false);

  const [useMyColors, setUseMyColors] = useState<boolean>(() => Boolean(customColorIds?.length));

  const [showMyColorsModal, setShowMyColorsModal] = useState(false);

  const [myColorCount, setMyColorCount] = useState(() => myColorsService.getSelectedIds().length);

  const [activeCustomColorIds, setActiveCustomColorIds] = useState<string[] | undefined>(customColorIds);

  const [cellSize, setCellSize] = useState(12);

  const [recentColors, setRecentColors] = useState<BeadColor[]>([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditPanelClosing, setIsEditPanelClosing] = useState(false);
  const [replacedColors, setReplacedColors] = useState<Map<string, BeadColor>>(new Map());
  const [initialBeadData, setInitialBeadData] = useState<BeadPixelData | null>(null);
  const [highlightedColorId, setHighlightedColorId] = useState<string | null>(null);

  const [triedColorsMap, setTriedColorsMap] = useState<Map<string, string[]>>(new Map());
  const [showSaveModal, setShowSaveModal] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偠顕ч埀顒佺箞閻涱喗绗熼埀顒勭嵁閹烘绠ｆ繝闈涙－濞笺儵姊婚崒娆戭槮闁圭⒈鍋婇幆澶嬬附缁嬭法鐛ラ梺鍝勭▉閸樺ジ鎷戦悢鍏肩厪濠电偟鍋撳▍鍡涙煕鐎ｎ亜顏柡灞剧☉閳藉顫滈崼婵嗩潬濠电偛顕崢褏鈧碍婢橀～蹇斻偊鐟併倓姹楅梺鍦劋缁诲啴藟閺嶎厽鈷戠紒瀣硶缁犳煡鏌ㄩ弴妯虹仼妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傞獮瀣晜閻ｅ苯骞愰梺璇插嚱缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓?
  const [isSaving, setIsSaving] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹诧紕鎷归敓鐘崇厱闊洦妫戦懓鍧楁寠閻斿吋鐓欓柟顖嗗懏鎲奸梺??
  const [showShareModal, setShowShareModal] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞?
  const [showShoppingList, setShowShoppingList] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖骞戦幇闈涙缂佺虎鍘搁崑鎾绘⒒娴ｇ瓔娼愰柛搴″悑閹便劑濡舵径濠勶紵閻庡厜鍋撻柛鏇ㄥ墰閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閿旇桨绨婚棅顐㈡处閹搁箖宕洪敐鍡樺弿濠电姴鎳忛鐘绘煙閻熸澘顏┑鈩冩倐婵＄兘鏁傞崣銉ф晼婵犵數濮烽。钘壩ｉ崨鏉戠；闁告洦鍘搁崑鎾愁潩椤撶喓鍑￠梺浼欑悼閸忔﹢寮幘缁樺亹闁圭粯甯掔粊顕€姊绘笟鈧褏鎹㈤崱娑樼婵犻潧妫岄弸宥夋煏韫囧鈧牠鍩涢幋锔界厱婵犻潧妫楅鈺呮煃瑜滈崜娆撴偉閻撳海鏆﹂柟鐗堟緲閸愨偓濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷?
  const [excludedColorIds, setExcludedColorIds] = useState<Set<string>>(new Set()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岋繝宕堕妷銉т患缂備讲鍋撻柛顐犲劜閻撶姵绻涢弶鎴剱婵炲懎娲ら—鍐喆閸曨偀鏋欓梺璇″枛閸㈡煡鍩㈡惔銈囩杸闁瑰灝鍟╅幃锝嗕繆閻愵亜鈧洜鎹㈤幇鐗堝亯闁绘挸瀵掑鏍煣韫囨凹娼愮€规洖顦甸弻鏇熺箾閸喖濮曢梺璇查叄缁犳牕顫忓ú顏勪紶闁告洟娼ч崜鏉款渻閵堝骸骞橀柛蹇旓耿閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婅櫣娑甸崨顔惧涧缂備浇顕ч悧鎾荤嵁閸℃稑閱囬柕澶涚畱娴?

  const [showLoginModal, setShowLoginModal] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸樼晫绮╅悢鐓庡耿婵炲棙鍨归悡瀣⒑缁夊棗瀚峰▓鏇㈡煃闁垮鐏撮柟顔肩秺楠炰線骞掗幋婵愮€抽梻浣告惈椤戝棝宕归崸妤€钃熼柨娑樺閸嬫捇鏁愭惔婵囧枤闂佺粯鎸搁崥瀣€冮妷鈺傚€烽柤纰卞墰椤旀帡姊虹拠鈥虫灍缂侇喗鎹囬獮濠囨倷閸濆嫀銊╂煥閺冨倻鎽傚ù鐘欏洦鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊鐎规洘鍔欏畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕?

  const [showSmartMerge, setShowSmartMerge] = useState(false);

  const [previewZoom, setPreviewZoom] = useState({ scale: 1, minScale: 1, maxScale: 1, fitScale: 1 });



  const [isBackgroundMode, setIsBackgroundMode] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岋繝宕堕懜鐢电獧缂傚倸绉甸悧妤佺┍婵犲洤围闁告侗鍠栧▍锝囩磽娴ｆ彃浜鹃梺鍛婃处閸ㄩ亶鎮¤箛娑欑厱妞ゆ劧绲跨粻鏍ㄣ亜閵夛妇鐭嬮柕鍥у缁犳盯骞樼捄铏瑰幗婵犳鍠栭敃銊モ枍閿濆绠查柛鏇ㄥ灠鎯熼梺闈涱檧婵″洦绂嶉悙娴嬫斀闁绘ɑ顔栭弳顖涗繆閹绘帗鍤囩€规洩缍佸畷姗€顢欓幆褏銈﹀┑鐘灱濞夋稒寰勯崶顒€纾婚柟鍓х帛閺呮煡骞栫划鍏夊亾閼碱剛娉垮┑锛勫亼閸婃洜鎹㈤幇鐗堝亯闁绘挸瀵掑鏍煣韫囨凹娼愮€规洖顦甸弻鏇熺箾閸喖濮曢梺璇查叄缁犳牕顫忓ú顏勪紶闁告洟娼ч崜鏉款渻閵堝骸骞橀柛蹇旓耿閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹诧紕鎷归敓鐘崇厱闊洦妫戦懓璺ㄢ偓娈垮枔閸斿秴顭囪箛娑辨晝闁靛繆鍓濋澶愭⒒?
  const [bgSelectedColorId, setBgSelectedColorId] = useState<string | null>(null); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛洦缍囬柕濞垮劜閻ｎ剟姊洪崣銉т覆缂傚秳绶氬璇差吋婢跺á銊╂煏婢诡垰绉剁粈濠勭磽娴ｉ缚妾搁柛妯绘倐瀹曟垿骞樼紒妯锋嫽闂佺鏈悷褏鎷规导瀛樼厱閻庯綆浜滈顓㈡寠濠靛鐓熼柕蹇嬪焺閻掗箖鏌＄€ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勯梻浣规た閸樹粙銆冮崱娑樜﹂柛鏇ㄥ灠缁犳盯鏌嶆潪鎷岊唹闁稿鎹囨俊鑸靛緞婵犲啳绶㈡繝鐢靛Т閿曘倝鎮ф繝鍥ㄥ亗婵炲棗娴氬〒濠氭倵閿濆簼閭い搴㈩殜閺屾稑螣缂佹ê鍞夐梺鍝勫閸撴繈骞忛崨顖涘枂闁告洦鍋嗛敍鎾绘煟鎼淬埄鍟忛柛锝庡櫍瀹曟粓鎮㈤梹鎰畾闂佸壊鍋呭ú鏍嵁閵忊€茬箚闁靛牆鎷戝妤冪磼閹插鐣垫慨濠勭帛閹峰懘宕崟顐＄帛婵犵數濮崑鎾绘煕濡ゅ啫鍓遍柣鏂挎閳?

  const [bgExcludedIndices, setBgExcludedIndices] = useState<Set<number>>(new Set()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛洦缍囬柕濞垮劜閻ｎ剟姊洪崣銉т覆缂傚秳绶氬璇差吋婢跺á銊╂煏婢诡垰绉剁粈濠勭磽娴ｉ缚妾搁柛妯绘倐瀹曟垿骞樼紒妯锋嫽闂佺鏈悷锔剧矈閻楀牏绠惧璺侯儐缁€瀣偓瑙勬磻閸楀啿顕ｉ幘顔碱潊闁绘ɑ顔栧Σ鍫曟⒒娴ｇ鎮戠紒浣规尦瀵彃鈹戦崶銉ょ泊闂佽鍎兼慨銈夊磻閳╁啰绠鹃柛鈩冾殘缁犵増銇勮箛濠冩珕闁靛洤瀚粻娑㈠箻鐠鸿櫣鍘芥繝娈垮枛閿曘劌鈻嶉敐澶婄闁告洦鍨版儫闂侀潧顧€婵″洭鍩€椤掑嫮鐣烘慨濠冩そ瀹曨偊宕熼棃娑樺婵＄偑鍊ら崢楣冨礂濮椻偓閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴??
  const [bgViewMode, setBgViewMode] = useState<BackgroundEditMode>('select');
  const [bgAutoIndices, setBgAutoIndices] = useState<number[]>([]);
  const [bgSelectionSource, setBgSelectionSource] = useState<'manual' | 'auto' | null>(null);
  const [bgDetectionMessage, setBgDetectionMessage] = useState('');
  const [bgAutoStrength, setBgAutoStrength] = useState(55);
  const [bgProtectSubject, setBgProtectSubject] = useState(true);
  const [bgLastRemoval, setBgLastRemoval] = useState<RemovedBackgroundCell[]>([]);
  const [bgCandidateOnly, setBgCandidateOnly] = useState(false);
  const [bgBaselineData, setBgBaselineData] = useState<BeadPixelData | null>(null);
  const [bgCompareMode, setBgCompareMode] = useState<'current' | 'before'>('current');
  const [isBgAiCutoutLoading, setIsBgAiCutoutLoading] = useState(false);
  const [showAiCutoutUnlockModal, setShowAiCutoutUnlockModal] = useState(false);
  const pendingAiCutoutAfterRewardRef = useRef<(() => void) | null>(null);




  const {

    currentTool,

    setCurrentTool,

    currentColor,

    setCurrentColor,

    beadData,

    setBeadData,

    saveToHistory,

    undo,

    redo,

    setBeadAt,

    floodFill,

    history,

    historyIndex,

  } = useEditorStore();




  const canUndo = historyIndex > 0;

  const canRedo = historyIndex < history.length - 1;




  const [statistics, setStatistics] = useState<BeadStatistics[]>([]);




  const processImage = useCallback(async (

    isRegenerate: boolean = false,

    overrides?: {

      gridSize?: number;

      saturationBoost?: number;

      vibrancyPreference?: number;

    }

  ) => {

    if (!currentImageData) return;



    if (!isRegenerate) {

      setIsProcessing(true);

    }



    try {

      const nextGridSize = overrides?.gridSize ?? gridSize;

      const nextSaturationBoost = overrides?.saturationBoost ?? saturationBoost;

      const nextVibrancyPreference = overrides?.vibrancyPreference ?? vibrancyPreference;

      const pixels = await pixelizeImage(currentImageData, {

        gridWidth: nextGridSize,

        keepAspectRatio: true,

      });




      const excludeList = Array.from(excludedColorIds);

      if (activeCustomColorIds && activeCustomColorIds.length > 0) {


        const customSet = new Set(activeCustomColorIds);

        const { mardColors: allMard } = await import('../../data/beadColors');

        allMard.forEach(c => {

          if (!customSet.has(c.id) && !excludeList.includes(c.id)) {

            excludeList.push(c.id);

          }

        });

      }

      let beads = matchPixelsToBead(pixels, {

        colorCount,

        useLabSpace: true,           // 婵犵數濮烽弫鎼佸磻閻樿绠垫い蹇撴缁躲倝鏌﹀Ο渚▓闁绘帊绮欓弻銊╂偄閸濆嫅銏ゆ煛鐎ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤?Lab 闂傚倸鍊搁崐宄懊归崶銊х彾闁割偁鍎荤紞鏍ь熆閼搁潧濮堥柛瀣€块弻銊╂偄閸濆嫅銏ゆ煛鐎ｂ晝绐旈柡宀€鍠栭獮鍡氼槻妞わ絽纾惀顏堝箚瑜嬮崑銏ゆ煛瀹€瀣М妤犵偛娲、姘跺川椤旂晫妲ｉ梻鍌欐祰濡椼劎绮堟担琛″亾濮橆厽绶叉い顐㈢箲缁绘繂顫濋鍌︾床婵犵數濞€濞佳兠洪妶鍛鐟滃繒妲愰幘瀛樺濞寸姴顑呴幗鐢电磽娴ｇ瓔鍤欓柣妤佹尭椤曪絾绻濆顑┾晠鏌嶉崫鍕偓鍛婄濠婂牊鈷戦柛娑橈功閳藉鏌ㄩ弴顏堟閻庨潧銈稿畷鐔碱敍濞戞帗瀚奸柣鐔哥矌婢ф鏁埡浣勬盯骞嬮敂鐣屽幈闂婎偄娲﹀Λ鎴︽嚀鐠恒劉鍋撳▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅嗛梻浣稿閸嬪懎煤濮椻偓閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓悾宀€鐓夐梺鐟扮－閸嬨倖淇婇悜鑺ユ櫆缂佹稑顑勯幋鐑芥⒒閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓绾惧綊鏌涢锝嗙缁炬儳缍婇弻鈥愁吋鎼粹€茬爱闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噽椤︻參姊洪崨濠勬噧妞わ附婢橀埢宥夊箻缂佹ǚ鎷婚梺绋挎湰閼归箖鍩€椤掍焦鍊愰柟顔ㄥ洤绀冩い鏃囧亹閺屟冣攽閻樿宸ラ柟鍐差樀瀹曟垿骞橀幇浣瑰兊濡炪倖甯掗崐缁橆殭闂?
        saturationBoost: nextSaturationBoost,             // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇顓熷弿濠电姴瀚崝瀣煥濞戞瑥濮堥柟宄版嚇閹煎綊鐛崹顔荤敾婵犵绱曢崑鎴﹀磹閺嵮屾綎鐟滅増甯掔粈澶嬬箾閸℃ɑ灏电€规挷绶氶悡顐﹀炊閵娧€濮囬梺绋匡工椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕??
        vibrancyPreference: nextVibrancyPreference,          // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛袦濡炪們鍨哄ú鐔笺€侀弴顫稏妞ゆ挾鍋涘В鎰攽閿涘嫬浜奸柛濠冪墪椤繗銇愰幒鎴狀槷濠电偛妫欓幐鎯х暤娓氣偓閻擃偊宕堕妸锕€鏆楅梺鍝勬椤戝懓鐏嬫俊顐︻暒濞村洭宕楀畝鍕厱??
        excludeColors: excludeList,  // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岋繝宕堕妷銉т患缂備讲鍋撻柛顐犲劜閻撶姵绻涢弶鎴剱婵炲懎娲ら—鍐喆閸曨偀鏋欓梺璇″枛閸㈡煡鍩㈡惔銈囩杸闁瑰灝鍟╅幃锝嗕繆閻愵亜鈧洜鎹㈤幇鐗堝亯闁绘挸瀵掑鏍煣韫囨凹娼愮€规洖顦甸弻鏇熺箾閸喖濮曢梺璇查叄缁犳牕顫忓ú顏勪紶闁告洟娼ч崜鏉款渻閵堝骸骞橀柛蹇旓耿閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕??
      });




      if (simplifyLevel > 0) {

        const stats = calculateBeadStatistics(beads);

        const currentColorCount = stats.length;

        const minColors = 5;

        const targetColors = Math.max(

          minColors,

          Math.round(currentColorCount * (1 - simplifyLevel / 120))

        );

        if (targetColors < currentColorCount) {

          beads = reduceColors(beads, targetColors, allBeadColors);

        }

      }




      setBeadData(beads);
      setBgLastRemoval([]);



      if (!isRegenerate) {

        setInitialBeadData(JSON.parse(JSON.stringify(beads)));

      }




      const stats = calculateBeadStatistics(beads);

      setStatistics(stats);




      if (!currentColor && stats.length > 0) {

        setCurrentColor(stats[0].color);

      }



      if (!isRegenerate) {

        setReplacedColors(new Map());

      }



    } catch (error) {

      console.error('生成图案失败:', error);

    } finally {

      setIsProcessing(false);

      requestAnimationFrame(() => {

        requestAnimationFrame(() => {

          if (containerRef.current && savedScrollPosition.current > 0) {

            containerRef.current.scrollTop = savedScrollPosition.current;

          }

        });

      });

    }

  }, [currentImageData, gridSize, colorCount, simplifyLevel, saturationBoost, vibrancyPreference, excludedColorIds, activeCustomColorIds, setBeadData, currentColor, setCurrentColor]);



  useEffect(() => {

    initUser();

  }, [initUser]);




  useEffect(() => {

    if (currentImageData) {

      if (initializedImageDataRef.current === currentImageData) {

        return;

      }

      initializedImageDataRef.current = currentImageData;

      processImage();

    } else if (onBack) {

      onBack();

    } else {

      navigate('/mobile/create');

    }

  }, [currentImageData, navigate, onBack, processImage]);



  useEffect(() => {

    if (beadData) {

      const stats = calculateBeadStatistics(beadData);

      setStatistics(stats);

    }

  }, [beadData]);




  useEffect(() => {

    if (beadData) {

      const containerWidth = window.innerWidth - 64;

      const newCellSize = Math.floor(containerWidth / beadData.width);

      setCellSize(Math.max(8, Math.min(16, newCellSize)));

    }

  }, [beadData]);




  useEffect(() => {

    const styleId = 'slide-panel-keyframes';

    if (!document.getElementById(styleId)) {

      const style = document.createElement('style');

      style.id = styleId;

      style.textContent = `

        @keyframes slideInFromLeft {

          from { transform: translateX(-100%); opacity: 0; }

          to { transform: translateX(0); opacity: 1; }

        }

        @keyframes slideOutToLeft {

          from { transform: translateX(0); opacity: 1; }

          to { transform: translateX(-100%); opacity: 0; }

        }

      `;

      document.head.appendChild(style);

    }

  }, []);



  const handleCloseEditPanel = useCallback(() => {

    setIsEditPanelClosing(true);

    setTimeout(() => {

      setIsEditMode(false);

      setIsEditPanelClosing(false);

    }, 200); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鍊垫繛鍫濈仢濞呮﹢鏌涢敐蹇曞埌闁伙綁鏀辩缓鐣岀矙閸喖绁梻浣虹帛閺屻劑骞夐敓鐙€鏁傞柣鏂垮悑閳锋帒霉閿濆懏鍟為柟顖氱墦閺屾稒绻濋崒婊冪厽閻庤娲橀崝娆忣嚕娴犲鏁冮柣鏃囨腹婢?

  }, []);



  const getEraserColor = useCallback(() => {

    return allBeadColors.find(c => c.name.toLowerCase().includes('white')) || allBeadColors[0];

  }, []);



  const handleBeadClick = useCallback((x: number, y: number) => {

    if (!beadData) return;



    if (currentTool === 'fill') {

      const fillColor = currentColor || getEraserColor();

      floodFill(x, y, fillColor);

      saveToHistory();

    } else if (currentTool === 'brush') {

      if (currentColor) {

        setBeadAt(x, y, currentColor);

      }

    } else if (currentTool === 'eraser') {

      setBeadAt(x, y, getEraserColor());

    }

  }, [beadData, currentTool, currentColor, floodFill, setBeadAt, getEraserColor, saveToHistory]);




  const handleBeadDrag = useCallback((x: number, y: number) => {

    if (!beadData) return;



    if (currentTool === 'brush' && currentColor) {

      setBeadAt(x, y, currentColor);

    } else if (currentTool === 'eraser') {

      setBeadAt(x, y, getEraserColor());

    }

  }, [beadData, currentTool, currentColor, setBeadAt, getEraserColor]);



  const handleDragEnd = useCallback(() => {

    if (currentTool === 'brush' || currentTool === 'eraser') {

      saveToHistory();

    }

  }, [currentTool, saveToHistory]);




  const handlePickColor = useCallback((color: BeadColor) => {

    setCurrentColor(color);

    setCurrentTool('brush'); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濞⒀囧箹鏉堝墽纾垮ù鐘櫅椤啴濡堕崘銊ュ缂備胶绮敋妞ゎ偄绻橀幖鍦喆閸曨偆锛忛梻渚€娼ч…鍫ュ磿閺屻儲鍊靛Δ锝呭暞閳锋垿鏌涘┑鍡楊伌闁稿骸绻戦妵鍕敇閻樻彃骞嬮梺缁樹緱閸犳稓绮诲☉妯锋婵炲棗绻嗛崑鎾寸節濮橆厾鍘鹃梺璇″幗鐢帡宕濆鍕闁告侗鍋勯悘鍙夋叏婵犲倹鎯堥弫鍫ユ煕閵夋垵鍠氶悗铏節绾版ɑ顫婇柛瀣噽閸掓帡骞樺Ч鍥ｅ亾娴ｇ硶鏋庨柟鎯х－閻も偓闂備礁鎼ˇ鍐测枖閺囥埄鏁婇柛鈩冪⊕閳锋垹绱撴担濮戭亪鎮橀崡鐐╂斀妞ゆ柨鎼埀顒佺箓椤曪綁寮婚妷銉ь啇婵炶揪绲藉﹢閬嶅储閸楃偐鏀介柣鎰级椤ョ偤鏌ㄥ顑炵懓顭ㄩ崟鍨暭缂備浇椴哥敮妤咃綖閹达箑鍐€鐟滃酣鎮靛┑鍠棃鎮╅棃娑楃捕缂備胶绮敃銏ょ嵁閸愵煈鐓ラ柛顐ゅ枎濞堢喖姊洪棃娑辨闂傚嫬瀚伴、鏃堟偄閸忓皷鎷绘繛杈剧到閹诧繝骞嗛崼銉︾厱濠电姴鍊婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟鏇炩攽椤旀枻渚涢柛鎾寸〒缁柨煤椤忓懐鍘搁柣蹇曞仩椤曆勬叏閸岀偞鐓欐い鏂挎惈閻忚尙鈧娲忛崝宥囨崲濠靛绀嬫い蹇撴閿涚喖姊婚崒姘偓椋庣矆娴ｈ櫣绀婂┑鐘叉硽婢舵劕绠婚悹鍥皺椤ρ冣攽椤斿浠滈柛瀣尵閳ь剚顔栭崳顕€宕戞繝鍥╁祦婵☆垰鍚嬬€氭岸鏌涘▎蹇ｆ▓婵☆偆鍠栧缁樼瑹閳ь剙顭囪閹囧幢濡炪垺绋戣灃闁告粈鐒﹂弲?

    addToRecentColors(color);

  }, [setCurrentColor, setCurrentTool]);



  const addToRecentColors = (color: BeadColor) => {

    setRecentColors(prev => {

      const filtered = prev.filter(c => c.id !== color.id);

      return [color, ...filtered].slice(0, 10);

    });

  };




  const handleSelectColor = (color: BeadColor) => {

    setCurrentColor(color);

    addToRecentColors(color);

    setShowColorPicker(false);

  };




  const handleStatsColorClick = (color: BeadColor) => {

    if (highlightedColorId === color.id) {

      setHighlightedColorId(null);

    } else {

      setHighlightedColorId(color.id);

    }

  };





  const handleReplaceColor = useCallback((colorId: string) => {

    if (!beadData) return;




    const currentColorObj = allBeadColors.find(c => c.id === colorId);

    if (!currentColorObj) return;



    const initialColor = replacedColors.get(colorId) || currentColorObj;

    const initialColorId = initialColor.id;



    const triedColors = triedColorsMap.get(initialColorId) || [initialColorId];



    const nextColor = findNextSimilarColor(colorId, triedColors);



    if (nextColor) {

      const newBeadData = replaceColor(beadData, colorId, nextColor);

      setBeadData(newBeadData);




      setReplacedColors(prev => {

        const next = new Map(prev);

        next.delete(colorId); // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顒佹闂佺粯鍔曢顓犵不妤ｅ啯鐓冪憸婊堝礈閻旂厧钃熼柍鈺佸暞婵挳鎮峰▎蹇擃仼缁剧偓濞婇幃妤€鈻撻崹顔界彯闂佸憡鎸鹃崰鎰┍婵犲洤閱囬柡鍥╁仜閼板灝鈹戞幊閸婃洟鏁冮敐鍥潟闁挎洖鍊归埛鎺楁煕鐏炲墽鎳勭紒浣哄缁绘稒寰勭€ｎ偆顦伴悗瑙勬磻閸楁娊鐛Ο鍏煎珰闁肩⒈鍓﹂弨銊╂煟鎼淬値娼愭繛鍙夌墪鐓ら柕鍫濐槸閸戠娀鏌涢锝囩闁绘柨妫濋幃瑙勬姜閹峰矈鍔呴梺绋块缁绘垿濡甸崟顔剧杸闁规崘娉涢悡鐔兼⒑閸濆嫮鐒跨紒缁樼箓閻ｇ兘鎮㈢喊杈ㄦ櫍闂佺粯鍔忛弲婊堟倵娴煎瓨鈷掑ù锝堝Г閵嗗啴鏌ｉ幒鐐电暤妤犵偞鍨垮畷鎯邦檨闁搞倖娲橀妵鍕箳閹存繍浠奸柛銉︽尦濮婅櫣鍖栭弴鐐测拤濡炪們鍔岀换鎴犫偓?

        next.set(nextColor.id, initialColor); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戠痪顓炴噺閻濐亞绱掔拠鑼ⅵ妤犵偛妫濆畷濂稿Ψ閿曗偓娴?-> 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈢煯閸楀啿鐣烽幋鐐电瘈闁稿被鍊楅崝宄扳攽鎺抽崐鏇㈠箠韫囨稑鐓曢柟杈鹃檮閸嬶綁鏌熼鐔风瑨濠碘€炽偢閺岋紕鈧綆鍋勯悘鎾煛瀹€瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓崗鐓庝淮濡炪們鍨虹粙鎴︼綖濠靛绀傜痪鎷岄哺椤?

        return next;

      });



      setTriedColorsMap(prev => {

        const next = new Map(prev);

        const tried = [...triedColors, nextColor.id];

        next.set(initialColorId, tried);

        return next;

      });



      setHighlightedColorId(null);



      saveToHistory();

    }

  }, [beadData, replacedColors, triedColorsMap, setBeadData, saveToHistory]);



  const handleRestoreColor = useCallback((colorId: string) => {

    const initial = replacedColors.get(colorId);

    if (!initial || !beadData) return;



    const newBeadData = replaceColor(beadData, colorId, initial);

    setBeadData(newBeadData);



    setReplacedColors(prev => {

      const next = new Map(prev);

      next.delete(colorId);

      return next;

    });



    setTriedColorsMap(prev => {

      const next = new Map(prev);

      next.delete(initial.id);

      return next;

    });




    setHighlightedColorId(null);



    saveToHistory();

  }, [beadData, replacedColors, setBeadData, saveToHistory]);



  const handleRestoreAll = useCallback(() => {

    if (!initialBeadData) return;



    const restoredData = JSON.parse(JSON.stringify(initialBeadData));

    setBeadData(restoredData);

    setReplacedColors(new Map());

    setTriedColorsMap(new Map()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧鍠氱划顖氼嚗閸曨垰绠涙い鎾跺仜婢瑰嫭淇婇悙顏勨偓鏍箰閸洖鍨傛繛宸簼閸嬪倿鏌曟径鍡樻珕闁绘挾鍠栭弻锟犲磼濞戞﹩鍤嬮梺鍝ュ枔閸嬨倝寮婚敐鍫㈢杸闁挎繂鎳忛悵婵嬫⒑閸濆嫮鐏遍柛鐘崇墵楠炲啫顭ㄩ崨顖炩攺闁诲函缍嗛崑鎺懳涢弽顓熲拺閻犲洤寮堕崬澶嬨亜椤愩埄妲圭紒缁樼⊕缁绘繈宕惰閹??
    setHighlightedColorId(null); // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画闂佹寧娲栭崐褰掑磻鐎ｎ喗鐓熸俊顖涱儥閸ゆ瑩鏌＄€ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤啴濡堕崨顖滎唶闂佺粯鐗滈崢褔锝炶箛娑欐優閻熸瑥瀚壕顖炴⒑闂堟侗鐒鹃柛搴㈢叀閹銈ｉ崘鈹炬嫼闂佸憡绻傜€氱兘宕曡箛鏂讳簻妞ゆ挾濮撮崢鎾煟濞戝崬鏋︾紒鐘崇☉閳藉鈻庤箛濠備壕濠电姵纰嶉悡鐘绘煙椤撶喎绗掗柛鏃€绮嶇换娑㈠川椤愩垻浼堝┑顔硷攻濡炶棄鐣烽锕€绀嬫い鎰枎娴滈箖鏌涢锝嗙缁炬儳缍婇弻鈥愁吋鎼粹€茬爱闂?

    saveToHistory();

  }, [initialBeadData, setBeadData, saveToHistory]);




  const handleToggleExcludeColor = useCallback((colorId: string) => {

    setExcludedColorIds(prev => {

      const next = new Set(prev);

      if (next.has(colorId)) {

        next.delete(colorId);

      } else {

        next.add(colorId);

      }

      return next;

    });

  }, []);






  const handleEnterBackgroundMode = useCallback(() => {

    if (beadData) {
      setBgBaselineData(JSON.parse(JSON.stringify(beadData)));
    }
    setIsBackgroundMode(true);

    setBgSelectedColorId(null);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgAutoStrength(55);
    setBgProtectSubject(true);
    setBgCandidateOnly(false);
    setBgCompareMode('current');

    setBgViewMode('select'); // 婵犵數濮甸鏍窗濡ゅ啯鏆滄俊銈呭暟閻瑩鏌熼悜姗嗘畷闁哄懏绻堥弻鏇＄疀鐎ｎ亖鍋撻弴銏犲嚑濞撴埃鍋撻柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤啴濡堕崨顖滎唶闂佺粯鐗滈崢褔锝炶箛鎾佹椽顢斿鍡樻珖闂備線娼х换鍡涘疾濠婂牆鐓濋柛顐犲劜閳锋垿寮堕悙鏉戭棆闁告柨绉归弻鐔兼偡閻楀牊鎮欏銈嗘穿缂嶄線銆佸Δ鍛妞ゆ劕鐟崶銊у幈闂佹枼鏅涢崰姘枔閵忕妴褰掑礂閸忕厧纰嶉梺瀹狀潐閸ㄥ潡宕洪妷鈺佸耿婵°倕鍟╃划鎾⒒娓氣偓閳ь剛鍋涢懟顖涙櫠椤斿墽妫紓浣靛灩楠炴ɑ绻涢幋鐘虫毈闁糕斁鍋?

    setHighlightedColorId(null); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇娴滄鏌熼懝鐗堝涧缂佽鲸娲熷濂稿焵椤掆偓閳规垿鏁嶉崟顐℃澀闂佺顭堥崐婵嗙暦閵忋倖鍋╅悘鐐靛亾濞堟澘鈹戞幊閸婃洟宕悩璇茬；闁圭偓鍓氬鈺傘亜閹烘垵鈧粯顨欓梻??
  }, [beadData]);



  const handleExitBackgroundMode = useCallback(() => {

    setIsBackgroundMode(false);

    setBgSelectedColorId(null);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgAutoStrength(55);
    setBgProtectSubject(true);
    setBgCandidateOnly(false);
    setBgCompareMode('current');
    setBgBaselineData(null);

    setBgViewMode('select');

  }, []);



  const handleBgSelectColor = useCallback((index: number) => {

    if (!beadData) return;

    const bead = beadData.beads[index];

    if (!bead) return; // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绋撴晶妤冩暜閳ュ磭鏆﹂柟杈剧畱缁犲鏌涢敂璇插箻闁哄顭堥埞鎴︽倷閺夋垹浠搁梺鑽ゅ櫐缁犳垿鍩㈠澶婎潊闁靛牆妫岄幏娲⒑閸涘﹦绠撻悗姘煎墴閸┾偓妞ゆ巻鍋撻柣鏍帶閻ｇ兘骞囬弶鍨敤濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷掗柛灞剧懅椤︼妇绱撳鍜冭含閽樼喖鏌熼幑鎰靛殭缂佲偓閸屾稒鍙忔俊鐐额嚙娴滈箖鎮楀▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅嗛梻浣稿閸嬪懎煤濮椻偓閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓??
    setBgSelectedColorId(bead.id);
    setBgSelectionSource('manual');
    setBgAutoIndices([]);
    setBgDetectionMessage('已切换为手动选背景，点击同色格子可继续检查并排除误选。');

    setBgExcludedIndices(new Set()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娿儙鏃堟偐闂堟稐绮堕梺鎸庢处娴滎亜顕ｉ锕€绀冩い鏃囧亹閿涙粌鈹戦悙鏉戠仸闁荤噦绠撻、鏃堟偄閸忓皷鎷绘繛杈剧到閹诧繝骞嗛崼銉︾厱濠电姴鍊婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟鏇炩攽椤旀枻渚涢柛鎾寸〒缁棃鎼归崗澶婁壕婵炲牆鐏濆▍姗€鏌涢幘瀵告噰闁炽儻绠撴俊鎼佸煛娓氣偓閸炲爼姊虹紒妯荤叆闁硅绻濋、?
  }, [beadData]);




  const handleBgToggleExclude = useCallback((index: number) => {

    setBgExcludedIndices(prev => {

      const next = new Set(prev);

      if (next.has(index)) {

        next.delete(index);

      } else {

        next.add(index);

      }

      return next;

    });

  }, []);




  const getBgHighlightedIndices = useCallback((): number[] => {

    if (!beadData) return [];

    if (bgSelectionSource === 'auto') {
      return bgAutoIndices.filter((index) => !bgExcludedIndices.has(index));
    }

    if (!bgSelectedColorId) return [];

    return beadData.beads

      .map((bead, index) => ({ bead, index }))

      .filter(({ bead, index }) =>

        bead &&

        bead.id === bgSelectedColorId &&

        !bgExcludedIndices.has(index)

      )

      .map(({ index }) => index);

  }, [beadData, bgSelectedColorId, bgExcludedIndices, bgAutoIndices, bgSelectionSource]);



  const handleBgConfirmTransparent = useCallback(() => {

    if (!beadData) return;

    const indices = getBgHighlightedIndices();

    if (indices.length === 0) return;

    const removedCells = indices
      .map((index) => {
        const bead = beadData.beads[index];
        return bead ? { index, bead } : null;
      })
      .filter((item): item is RemovedBackgroundCell => Boolean(item));

    setBgLastRemoval(removedCells);



    setBeadData(applyTransparentIndices(beadData, indices));

    saveToHistory();



    setBgSelectedColorId(null);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');

  }, [beadData, getBgHighlightedIndices, setBeadData, saveToHistory]);



  const handleBgClearSelection = useCallback(() => {

    setBgSelectedColorId(null);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');

  }, []);

  const handleBgSwitchMode = useCallback((mode: BackgroundEditMode) => {
    const nextMode = bgViewMode === mode ? 'select' : mode;
    setBgViewMode(nextMode);

    if (nextMode === 'erase') {
      setBgSelectedColorId(null);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('手动擦背景已开启，点击任意格子可直接透明化。');
      return;
    }

    if (nextMode === 'restore') {
      setBgSelectedColorId(null);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('手动补背景已开启，点击透明格可从去背景前状态补回。');
      return;
    }

    if (nextMode === 'view') {
      setBgDetectionMessage('');
      return;
    }

    setBgDetectionMessage('');
  }, [bgViewMode]);

  const handleBgQuickRemove = useCallback(() => {

    if (!beadData) return;

    const suggestion = suggestQuickBackgroundRemoval(beadData, bgAutoStrength, {
      protectSubject: bgProtectSubject,
    });

    if (!suggestion || suggestion.indices.length === 0) {
      toast.warning('这张图暂时没有识别到可一键去掉的简单背景，可尝试手动选择或智能抠图。');
      return;
    }

    if (suggestion.aiRecommended) {
      setBgSelectionSource('auto');
      setBgAutoIndices(suggestion.indices);
      setBgExcludedIndices(new Set());
      setBgSelectedColorId(suggestion.primaryColorId);
      setBgDetectionMessage(`已圈出候选背景 ${suggestion.indices.length} 格。${suggestion.reason}`);
      setBgViewMode('select');
      toast.info('这张图背景较复杂，建议使用智能抠图，再按需要手动微调。');
      return;
    }

    const removedCells = suggestion.indices
      .map((index) => {
        const bead = beadData.beads[index];
        return bead ? { index, bead } : null;
      })
      .filter((item): item is RemovedBackgroundCell => Boolean(item));

    setBgLastRemoval(removedCells);
    setBeadData(applyTransparentIndices(beadData, suggestion.indices));
    saveToHistory();
    setBgSelectionSource(null);
    setBgAutoIndices([]);
    setBgExcludedIndices(new Set());
    setBgSelectedColorId(null);
    setBgDetectionMessage(`已自动去掉 ${suggestion.indices.length} 格背景。`);
    toast.success(`已自动去掉 ${suggestion.indices.length} 格背景。`);

  }, [beadData, bgAutoStrength, bgProtectSubject, saveToHistory, setBeadData, toast]);

  const runBgAiCutout = useCallback(() => {
    if (!currentImageData) {
      showAlert('当前没有可处理的原图，请先返回上一步重新导入图片。', {
        type: 'warning',
        title: '无法开始智能抠图',
      });
      return;
    }

    setIsBgAiCutoutLoading(true);
    requestAiCutout({
      imageData: currentImageData,
      mode: 'foreground-segmentation',
    })
      .then((result) => {
        initializedImageDataRef.current = null;
        setLastAiCutoutImageData(currentImageData);
        setCurrentImageData(result.imageData);
        handleExitBackgroundMode();
        toast.success('智能抠图已应用，正在重新生成图案。');
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '智能抠图处理失败，请稍后重试。';
        showAlert(message, {
          type: 'error',
          title: '智能抠图失败',
        });
      })
      .finally(() => {
        setIsBgAiCutoutLoading(false);
      });
  }, [currentImageData, handleExitBackgroundMode, showAlert, toast]);

  const handleBgAiCutout = useCallback(() => {
    const status = getAiCutoutAvailability();

    if (status.available) {
      const decision = adService.getAiCutoutDecision();
      if (!decision.allowed) {
        pendingAiCutoutAfterRewardRef.current = () => {
          const unlockedDecision = adService.getAiCutoutDecision();
          if (unlockedDecision.allowed) {
            adService.recordAiCutoutOpened(unlockedDecision.channel);
          }
          runBgAiCutout();
        };
        setShowAiCutoutUnlockModal(true);
        return;
      }

      adService.recordAiCutoutOpened(decision.channel);
      runBgAiCutout();
      return;
    }

    showAlert(
      <div style={styles.aiCutoutStatusContent}>
        <p style={styles.aiCutoutStatusParagraph}>{status.description}</p>
        <div style={styles.aiCutoutStatusCard}>
          <div style={styles.aiCutoutStatusRow}>
            <span style={styles.aiCutoutStatusLabel}>服务供应商</span>
            <span style={styles.aiCutoutStatusValue}>{status.providerLabel}</span>
          </div>
          <div style={styles.aiCutoutStatusRow}>
            <span style={styles.aiCutoutStatusLabel}>推荐解锁方式</span>
            <span style={styles.aiCutoutStatusValue}>{status.recommendedEntryLabel}</span>
          </div>
          <div style={styles.aiCutoutStatusRow}>
            <span style={styles.aiCutoutStatusLabel}>当前状态</span>
            <span style={styles.aiCutoutStatusValue}>{status.available ? '已就绪' : '尚未接通'}</span>
          </div>
        </div>
        <p style={styles.aiCutoutStatusNext}>{status.nextStep}</p>
      </div>,
      {
        type: 'info',
        title: status.title,
      }
    );
  }, [runBgAiCutout, showAlert]);

  const handleRestoreAiCutoutSource = useCallback(() => {
    if (!lastAiCutoutImageData) return;

    initializedImageDataRef.current = null;
    setCurrentImageData(lastAiCutoutImageData);
    setLastAiCutoutImageData(null);
    setBgLastRemoval([]);
    toast.success('已恢复到智能抠图前的原图。');
  }, [lastAiCutoutImageData, toast]);

  const handleBgRestoreLastRemoval = useCallback(() => {
    if (!beadData || bgLastRemoval.length === 0) return;

    const nextBeads = [...beadData.beads];
    bgLastRemoval.forEach(({ index, bead }) => {
      nextBeads[index] = bead;
    });

    setBeadData({
      ...beadData,
      beads: nextBeads,
    });
    saveToHistory();
    setBgLastRemoval([]);
    setBgDetectionMessage(`已恢复 ${bgLastRemoval.length} 格到去背景前状态。`);
    toast.success(`已恢复 ${bgLastRemoval.length} 格背景。`);
  }, [beadData, bgLastRemoval, saveToHistory, setBeadData, toast]);

  const handleBgRestoreSingleCell = useCallback((index: number) => {
    if (!beadData || !bgBaselineData) return;

    const baselineBead = bgBaselineData.beads[index];
    if (!baselineBead) return;

    const nextBeads = [...beadData.beads];
    nextBeads[index] = baselineBead;

    setBeadData({
      ...beadData,
      beads: nextBeads,
    });
    saveToHistory();
    setBgLastRemoval((prev) => prev.filter((item) => item.index !== index));
    setBgDetectionMessage('已恢复 1 格背景，可继续点击其他透明格补回。');
  }, [beadData, bgBaselineData, saveToHistory, setBeadData]);

  const handleBgManualEraseCell = useCallback((index: number) => {
    if (!beadData) return;

    const bead = beadData.beads[index];
    if (!bead) return;

    setBgLastRemoval([{ index, bead }]);
    setBeadData(applyTransparentIndices(beadData, [index]));
    saveToHistory();
    setBgDetectionMessage('已手动擦除 1 格背景，可继续点击其他格子细修。');
  }, [beadData, saveToHistory, setBeadData]);

  const bgRecoverableIndices = React.useMemo(
    () => {
      const recoverable = new Set<number>();
      if (!beadData || !bgBaselineData) return recoverable;

      beadData.beads.forEach((bead, index) => {
        if (!bead && bgBaselineData.beads[index]) {
          recoverable.add(index);
        }
      });

      return recoverable;
    },
    [beadData, bgBaselineData]
  );
  const bgPreviewBeadData = bgCompareMode === 'before' && bgBaselineData ? bgBaselineData : beadData;
  const isBgComparingBefore = bgCompareMode === 'before' && !!bgBaselineData;

  useEffect(() => {
    if (!beadData || !isBackgroundMode || bgSelectionSource !== 'auto') {
      return;
    }

    const suggestion = suggestQuickBackgroundRemoval(beadData, bgAutoStrength, {
      protectSubject: bgProtectSubject,
    });
    if (!suggestion || suggestion.indices.length === 0) {
      setBgAutoIndices([]);
      setBgSelectedColorId(null);
      setBgDetectionMessage('当前强度下没有找到稳定背景候选区，可调高强度或改用手动选择。');
      return;
    }

    setBgAutoIndices(suggestion.indices);
    setBgSelectedColorId(suggestion.primaryColorId);
    setBgDetectionMessage(`重新圈出 ${suggestion.indices.length} 格背景候选区。${suggestion.reason}`);
  }, [beadData, bgAutoStrength, bgProtectSubject, isBackgroundMode, bgSelectionSource]);




  const saveEditorStateToSession = useCallback(() => {

    if (!currentImageData) return;

    try {

      const editorState: EditorStateData = {

        imageData: currentImageData,

        colorCount,

        gridWidth: gridSize,

        customColorIds: activeCustomColorIds,

      };

      sessionStorage.setItem('editorData', JSON.stringify(editorState));

    } catch (e) {

      console.warn('保存编辑器状态到会话失败:', e);

    }

  }, [currentImageData, colorCount, gridSize, activeCustomColorIds]);



  const handleStartMakingClick = (e?: React.MouseEvent) => {

    if (!beadData) return;

    const e2eBypassLogin = import.meta.env.DEV && typeof window !== 'undefined' && Boolean((window as any).__E2E_BYPASS_LOGIN__);

    if (!isLoggedIn && !e2eBypassLogin) {

      showConfirm('登录后可保存方案并同步进度，现在去登录吗？', {

        title: '需要先登录',

        type: 'info',

        confirmText: '去登录',

        onConfirm: () => {

          saveEditorStateToSession();

          navigate('/mobile/login', { state: { from: '/mobile/editor' } });

        },

      });

      return;

    }

    if (e?.shiftKey || e2eBypassLogin) {

      navigate('/mobile/making', {

        state: { beadData, colorCount },

      });

      return;

    }

    setShowSaveModal(true);

  };



  const getColorDisplayInfo = useCallback((color: BeadColor) => {

    const nameCN = (color.nameCN || '').trim();

    const nameEN = (color.name || '').trim();

    if (nameCN && nameCN.toLowerCase() !== color.id.toLowerCase()) {

      return { name: nameCN, showCode: true };

    }

    if (nameEN && nameEN.toLowerCase() !== color.id.toLowerCase()) {

      return { name: nameEN, showCode: true };

    }

    return { name: `色号 ${color.id}`, showCode: false };

  }, []);



  const handleShareClick = useCallback(() => {

    if (!isLoggedIn) {

      showConfirm('登录后才可以分享图纸到社区，现在去登录吗？', {

        title: '需要先登录',

        type: 'info',

        confirmText: '去登录',

        onConfirm: () => {

          saveEditorStateToSession();

          navigate('/mobile/login', { state: { from: '/mobile/editor' } });

        },

      });

      return;

    }

    setShowShareModal(true);

  }, [isLoggedIn, showConfirm, saveEditorStateToSession, navigate]);



  const handleLoginSuccess = () => {

    setShowLoginModal(false);


    setShowSaveModal(true);

  };



  const generateThumbnail = useCallback(() => {

    if (!beadData) return '';

    const canvas = document.createElement('canvas');

    renderBeadsToCanvas(beadData, canvas, 4, false, false);

    return canvas.toDataURL('image/jpeg', 0.7);

  }, [beadData]);



  const handleSaveProject = async (name: string) => {

    if (!beadData) {

      toast.error('娌℃湁鍙繚瀛樼殑鍥炬鏁版嵁');

      return;

    }



    setIsSaving(true);

    try {

      const thumbnail = generateThumbnail();

      const originalImage = imageData || thumbnail;



      if (isLoggedIn) {

        let thumbnailUrl = '';

        let originalImageUrl = '';

        try {

          const [thumbUrl, origUrl] = await Promise.all([

            uploadApi.uploadImage(thumbnail, 'thumbnails'),

            uploadApi.uploadImage(originalImage, 'originals'),

          ]);

          thumbnailUrl = thumbUrl;

          originalImageUrl = origUrl;

        } catch (uploadError) {

          console.error('上传图片失败:', uploadError);

          toast.error('图片上传失败，已取消本次云端保存。');

          setIsSaving(false);

          return;

        }



        const response = await projectApi.create({

          name,

          thumbnail_url: thumbnailUrl,

          original_image: originalImageUrl,

          bead_data: {

            width: beadData.width,

            height: beadData.height,

            beads: beadData.beads.map(b => ({

              id: b.id,

              name: b.name,

              nameCN: b.nameCN,

              rgb: b.rgb,

              hex: b.hex,

              brand: b.brand,

            })),

          },

          settings: {

            gridSize,

            gridHeight: beadData.height,

            colorCount,

            saturationBoost,

            vibrancyPreference,

          },

        });



        if (response.code === 0) {

          toast.success('方案已保存，正在进入制作模式。');

          setShowSaveModal(false);

          navigate('/mobile/making', {

            state: { beadData, colorCount, projectId: response.data.id },

          });

        } else {

          console.error('创建方案失败:', response.msg);

          toast.warning('云端保存失败，已自动转存到本地方案。');

          saveToLocal(name, thumbnail, originalImage);

        }

      } else {

        saveToLocal(name, thumbnail, originalImage);

      }

    } catch (error) {

      console.error('保存方案异常:', error);

      toast.warning('云端保存异常，将直接进入制作模式。');

      setShowSaveModal(false);

      navigate('/mobile/making', {

        state: { beadData, colorCount },

      });

    } finally {

      setIsSaving(false);

    }

  };




  const saveToLocal = (name: string, thumbnail: string, originalImage: string) => {

    if (!beadData) return;

    try {

      const projectPayload = {

        name,

        thumbnail,

        originalImage: originalImage.length > 2_000_000 ? thumbnail : originalImage,

        beadData: {

          width: beadData.width,

          height: beadData.height,

          beads: beadData.beads.map(b => b ? {

            id: b.id,

            name: b.name,

            nameCN: b.nameCN,

            rgb: b.rgb,

            hex: b.hex,

            brand: b.brand,

          } : { id: '', name: '', nameCN: '', rgb: [0, 0, 0] as [number, number, number], hex: '#000', brand: 'mard' }),

        },

        settings: {

          gridSize,

          gridHeight: beadData.height,

          colorCount,

          saturationBoost,

          vibrancyPreference,

        },

      };



      let result: { id: number };

      try {

        result = localStorageService.createProject(projectPayload);

      } catch {

        result = localStorageService.createProject({ ...projectPayload, originalImage: thumbnail });

      }

      toast.success('本地方案已保存，正在进入制作模式。');

      setShowSaveModal(false);

      navigate('/mobile/making', {

        state: { beadData, colorCount, localProjectId: result.id },

      });

    } catch (e) {

      console.error('本地保存失败:', e);

      toast.warning('本地保存失败，将直接进入制作模式。');

      setShowSaveModal(false);

      navigate('/mobile/making', {

        state: { beadData, colorCount },

      });

    }

  };



  const lastAppliedParamsRef = useRef({ gridSize, saturationBoost, vibrancyPreference });




  const handleRegenerate = () => {

    if (canUndo) {

      if (!window.confirm('当前还有未保存的编辑结果，重新生成会覆盖这些修改，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        return;

      }

    }


    lastAppliedParamsRef.current = { gridSize, saturationBoost, vibrancyPreference };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    processImage(true); // true 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ゅ嵆閳ユ棃宕橀浣镐壕闁挎繂绨肩花浠嬫煛閸曨偄鈧悂婀侀梺缁樏壕顓灻虹€涙ɑ鍙忓┑鐘叉噺椤忕娀鏌熼悷鏉款伃濠碘剝鎮傛俊鐑芥晜闁款垰浜惧Δ锝呭暞閳锋垿鏌涘┑鍡楊伌闁稿骸绻戦妵鍕敇閻樻彃骞嬮梺缁樹緱閸犳稓绮诲☉妯锋婵炲棗绻嗛崑鎾寸節濮橆厾鍘鹃梺璇″幗鐢帡宕濆鍕闁告侗鍋勯悘鍙夋叏婵犲啯銇濈€规洦鍋婂畷鐔碱敃閻旇渹澹曢梺鍓插亝濞叉牜澹曡ぐ鎺撶厸鐎广儱楠告禍鎰版煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傚顕€宕奸悢鍝勫箞婵犲痉鏉库偓鎾剁矆娓氣偓閸┿垽寮撮姀锛勫幐婵炶揪绲块幊鎾存叏瀹€鈧槐鎺楁偐瀹曞洦鍒涢悗娈垮櫘閸撴瑩鍩㈡惔銊ョ煑闁靛／鍐炬П闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇閸庮亪姊洪懡銈呮瀾婵犮垺顭囧濠囨嚃閳哄啰锛濋梺绋挎湰閻熝囧礉瀹ュ洨纾奸悗锝庡亞婢х敻鏌ㄥ┑鍫濅沪鐎垫澘瀚禒锔剧矙婢剁顥氭繝娈垮枟钃遍柛鎾磋壘椤洭骞囬悧鍫㈠幍婵炴挻鑹鹃悘婵囦繆閸ф鐓冪憸婊堝礈閵娧呯闁糕剝绋戠粣妤佷繆閵堝懏鍣归柣銈夌畺閺岀喖姊荤€电濡介梺缁樻尰閻╊垶寮诲☉姘勃濞戞柨鎷嬫禍顏堝春閳ь剚銇勯幒宥堝厡濠⒀囦憾閺屽秷顧侀柛鎾村哺閹虫繈宕滆缁€濠傗攽閻樺弶鎼愰柦鍐枛閺屾洘绻涢悙顒佺彆闂佺顑呯€氼喚妲愰幒鏂哄亾閿濆骸骞楃痪顓炵埣閺屾洟宕煎┑鍫⑿ㄥ┑顔硷龚濞咃絿妲愰幒鎳崇喖宕归鍛棨闂傚倷绀侀浠嬪级閸噮鐎烽梻渚€鈧偛鑻晶顖炴煠閻熸澘鈷旂紒杈╁仦缁绘繈宕惰閹芥洟姊洪棃娴ュ牓寮插鍫濈；闁告洦鍨遍崑锝夋煕閵夛絽濡块柡鍡樼懇閺岀喖宕滆鐢盯鏌ｉ幘瀵告噭妞ゃ劊鍎甸幃娆撴嚑椤戣儻妾搁梻浣筋嚙缁绘垿鎮￠敓鐘茶摕闁斥晛鍟刊鎾偡濞嗗繐顏╃痪鐐▕閹鈻撻崹顔界彯闂佸憡鎸鹃崰鎰┍婵犲洤閱囬柡鍥╁仜閼板灝鈹戞幊閸婃洟鏁冮敐鍥潟闁挎洖鍊归悡?
  };

  useEffect(() => {

    setGridSizeInput(String(gridSize));

  }, [gridSize]);

  const handleRegenerateWithGridSize = (nextValue: number) => {

    const normalizedValue = normalizeGridSize(nextValue);

    if (normalizedValue === gridSize) {

      setGridSizeInput(String(normalizedValue));

      return;

    }

    if (canUndo) {

      if (!window.confirm('当前还有未保存的编辑结果，重新生成会覆盖这些修改，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        setGridSizeInput(String(lastAppliedParamsRef.current.gridSize));

        return;

      }

    }

    lastAppliedParamsRef.current = {

      gridSize: normalizedValue,

      saturationBoost,

      vibrancyPreference,

    };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    setGridSize(normalizedValue);

    setGridSizeInput(String(normalizedValue));

    processImage(true, {

      gridSize: normalizedValue,

      saturationBoost,

      vibrancyPreference,

    });

  };

  const handleGridSizeStep = (delta: number) => {

    handleRegenerateWithGridSize(gridSize + delta);

  };

  const handleGridSizeInputCommit = () => {

    const parsedValue = Number(gridSizeInput);

    handleRegenerateWithGridSize(Number.isFinite(parsedValue) ? parsedValue : gridSize);

  };

  const handleRegenerateWithSaturation = (nextValue: number) => {

    const normalizedValue = Math.min(30, Math.max(0, Math.round(nextValue)));

    if (normalizedValue === saturationBoost) {

      return;

    }

    if (canUndo) {

      if (!window.confirm('当前还有未保存的编辑结果，重新生成会覆盖这些修改，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        setGridSizeInput(String(lastAppliedParamsRef.current.gridSize));

        return;

      }

    }

    lastAppliedParamsRef.current = {

      gridSize,

      saturationBoost: normalizedValue,

      vibrancyPreference,

    };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    setSaturationBoost(normalizedValue);

    processImage(true, {

      gridSize,

      saturationBoost: normalizedValue,

      vibrancyPreference,

    });

  };




  const currentColorOption = colorCountOptions.find(opt => opt.count === colorCount);

  const totalBeads = beadData?.beads.length || 0;



  const handleToggleMyColors = () => {

    if (!useMyColors) {

      const selectedIds = myColorsService.getSelectedIds();

      if (selectedIds.length === 0) {

        setShowMyColorsModal(true);

        return;

      }

      setUseMyColors(true);

      setActiveCustomColorIds(selectedIds);

      setMyColorCount(selectedIds.length);

      return;

    }



    setUseMyColors(false);

    setActiveCustomColorIds(undefined);

  };



  const handleApplyPaletteSettings = () => {

    if (useMyColors) {

      const selectedIds = myColorsService.getSelectedIds();

      setActiveCustomColorIds(selectedIds.length > 0 ? selectedIds : undefined);

      setMyColorCount(selectedIds.length);

    } else {

      setActiveCustomColorIds(undefined);

    }

    handleRegenerate();

  };



  const boardRecommendation = beadData ? recommendBoard(beadData.width, beadData.height) : null;



  const dominantBrand = React.useMemo(() => {

    if (!beadData) return 'MARD';

    const brandCount: Record<string, number> = {};

    beadData.beads.forEach(b => {
      if (!b) {
        return;
      }

      const brand = b.brand || 'unknown';

      brandCount[brand] = (brandCount[brand] || 0) + 1;

    });

    let maxBrand = 'MARD';

    let maxCount = 0;

    Object.entries(brandCount).forEach(([brand, count]) => {

      if (count > maxCount) {

        maxCount = count;

        maxBrand = brand;

      }

    });

    const brandNames: Record<string, string> = { mard: 'MARD', perler: 'Perler', hama: 'Hama', artkal: 'Artkal' };

    return brandNames[maxBrand.toLowerCase()] || maxBrand.toUpperCase();

  }, [beadData]);



  return (

    <div ref={containerRef} style={styles.container}>

      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒濠殿喛顫夐悡锟犲蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犳牠鐛崘顏呭枂闁告洦鍓欓鎾剁磽娴ｅ湱鈽夋い鎴濇缁辩偤宕奸妷锔惧幗闁瑰吋鎯屽鈧ù婧垮灪閵囧嫰顢曢姀鈺傂﹀銈嗘磸閸庨潧鐣烽悢纰辨晬婵﹢纭搁崯瀣繆閻愵亜鈧牕螞娴ｈ鍙忛柕鍫濇噳閺嬪秹鏌曡箛瀣偓鏍煕閹达附鐓曟繝闈涙椤忊晠鏌嶈閸撴瑩鎮ラ悡搴ｆ殾闁圭増婢橀崘鈧銈嗗姉閸犲孩绂嶉悙顒佸弿婵妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷掗柛灞剧懅椤︼妇绱撳鍜冭含閽樼喖鏌熼幑鎰靛殭缂佲偓閸屾稒鍙忔俊鐐额嚙娴滈箖鎮楀▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅?*/}

      <div style={styles.header}>

        <button style={styles.backBtn} onClick={() => (onBack ? onBack() : navigate(-1))}>

          <ArrowLeft size={20} weight="bold" />

        </button>

        <h1 style={styles.title}>编辑图案</h1>

        <div style={styles.headerPlaceholder} />

      </div>

      {/* Header闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩顔瑰亾閸愵喖閱囬柣鏃傤焾瀵潡鎮楃憴鍕婵炲眰鍔庣划?*/}

      <div style={styles.headerSpacer} />



      {/* 闂傚倸鍊搁崐鐑芥倿閿曞倸绠栭柛顐ｆ礀绾惧潡鏌ｉ姀銏℃毄濞戞挸绉归弻鈥愁吋鎼粹€崇闂佸搫顑勭欢姘跺蓟閻旂厧绠查柟浼存涧濞堫厼鈹戦埥鍡椾簼闁挎洏鍨藉濠氬即閵忕娀鍞跺┑鐘绘涧濞村倸螞閻愬樊娓婚柕鍫濇噽缁犵儤绻涙径瀣灱闁诲繐顑夊娲传閸曞灚笑闂佽绻戠换鍫ャ€侀弮鍫晣闁靛骏绱曢崢鍛婄箾鏉堝墽绉い顐㈩槸閻ｅ嘲鐣濋埀顒勫焵椤掍緡鍟忛柛锝庡櫍瀹曟粓鎮㈤梹鎰畾闂佸壊鍋呭ú鏍嵁閵忊€茬箚闁靛牆鎷戝妤冪磼??- 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒濠殿喛顫夐悡锟犲蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犳牠鐛崘顏呭枂闁告洦鍓欓鎾剁磽娴ｅ湱鈽夋い鎴濇缁辩偤宕奸妷锔惧幗闁瑰吋鐣崹鍏肩珶濡偐纾界€广儱鎷戦煬顒傗偓娈垮枛椤攱淇婇幖浣哥厸闁稿本鐭花濠氭⒑閼姐倕孝婵炲眰鍊曢锝夘敆閳ь剟鍩為幋鐘亾閿濆骸浜滃ù鐙€鍨辩换娑欐綇閸撗勫仹闂佺儵鍓濋弻銊┾€﹂崶顒€绠涢柣妤€鐗嗛埀??*/}

      <div style={styles.previewSection}>

          {isProcessing ? (

            <div style={styles.loadingBox}>

              <div style={styles.loadingSpinner} />

              <p style={styles.loadingText}>正在重新生成图案，请稍候...</p>

            </div>

          ) : beadData ? (

            <InteractiveCanvas
              ref={interactiveCanvasRef}

              beadData={beadData}

              cellSize={cellSize}

              currentTool={currentTool}

              currentColor={currentColor}

              isEditMode={isEditMode}

              highlightedColorId={highlightedColorId}

              onBeadClick={handleBeadClick}

              onBeadDrag={handleBeadDrag}

              onDragEnd={handleDragEnd}

              onPickColor={handlePickColor}
              showControls={false}
              onScaleChange={setPreviewZoom}

            />

          ) : null}



          {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噸缁卞爼姊洪棃娑辨▓闁搞劌纾划鍫ュ焵椤掑嫭鈷掑ù锝呮啞閹牊銇勯敂璇茬仸闁诡啫鍕瘈闁搞儜鍐偓顓㈡⒑缁夊棗瀚峰▓鏃堟煛鐎ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤啴濡堕崨顖滎唶闂佺粯鐗滈崢褔锝?- 婵犵數濮烽。钘壩ｉ崨鏉戠；闁告侗鍙庨悢鍡樹繆椤栨氨姣為柛瀣尭椤繈顢曢姀鐘点偖闁诲孩顔栭崳顕€宕戞繝鍥╁祦婵☆垰鍚嬬€氭岸鏌涘▎蹇ｆ▓婵☆偆鍠栧缁樼瑹閳ь剙顭囪閹囧幢濡炪垺绋戣灃闁告粈鐒﹂弲婊堟⒑閸撴彃浜濇繛鍙夛耿閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓悾宀€鐓夐梺鐟扮－閸嬨倖淇婇悜鑺ユ櫆缂佹稑顑勯幋鐑芥⒒閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓绾惧綊鏌涢锝嗙缁炬儳缍婇弻鈥愁吋鎼粹€茬爱闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇濞堛儵姊洪棃娑氬婵炲眰鍔岄悾宄懊洪鍛嫽婵炶揪绲介幉锟犲箚閸儲鐓曞┑鐘插€婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟?*/}

          {beadData && !isEditMode && (

            <button

              style={styles.floatingEditBtn}

              onClick={() => {

                setShowPaletteSettings(false);

                setShowStats(false);

                setIsEditMode(true);

              }}

            >

              <PencilSimple size={18} weight="fill" />

            </button>

          )}



          {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸犳寮茬捄浣曟棃宕ラ挊澶嬪枠濠碘剝鎮傞弫鍌涙姜閹殿喚娉块梻鍌欑濠€閬嶅磿閵堝鏄ュ┑鐘叉搐缂佲晛鈹戦悩宕囶暡闁稿﹤鐏氶幈銊ヮ潨閸℃顫紓浣割槹濡炰粙寮婚敍鍕勃閻犲洦褰冮～鍥⒑鐠団€虫灁闁搞劏妫勯悾鐑藉Ω閿斿墽鐦堥梺鍛婃处娴滅偟澹曢崸妤佲拻闁稿本鐟ㄩ崗宀勬煙閾忣偅宕岀€规洘鐓″濠氬Ψ閵夈儳鍝庨梻浣告贡缁垰鐣烽悷鎵虫闁靛繒濮烽ˇ鏉款渻閵堝棛澹勭紒鏌ョ畺瀵煡鏁愭径瀣ф嫼闂傚倸鐗婃笟妤呮偂椤撶姷纾奸柣妯哄暱閻忓瓨銇勯姀鈩冾棃鐎规洖銈稿鎾偄閸欏顏归梻浣藉吹婵灚绂嶆禒瀣鐎光偓閸曨偄鍤戦梺纭呮彧闂勫嫰鎮″☉銏″€甸柨婵嗙凹閹查箖鏌ｉ幘鍐叉倯妞?*/}

          {beadData && !isEditMode && (
            <>
              <div style={styles.floatingUtilityStack}>
                <button
                  style={{
                    ...styles.floatingUtilityBtn,
                    ...(showPaletteSettings ? styles.floatingUtilityBtnActive : {}),
                  }}
                  onClick={() => {
                    setShowPaletteSettings((prev) => {
                      const next = !prev;
                      if (next) setShowStats(false);
                      return next;
                    });
                  }}
                  aria-label="打开色系设置"
                >
                  <Palette size={16} weight="fill" />
                  <span style={styles.floatingUtilityLabel}>色系</span>
                </button>

                <button
                  style={{
                    ...styles.floatingUtilityBtn,
                    ...(showStats ? styles.floatingUtilityBtnActive : {}),
                  }}
                  onClick={() => {
                    setShowStats((prev) => {
                      const next = !prev;
                      if (next) setShowPaletteSettings(false);
                      return next;
                    });
                  }}
                  aria-label="打开豆子统计"
                >
                  <ListBullets size={16} weight="fill" />
                  <span style={styles.floatingUtilityLabel}>统计</span>
                </button>
              </div>

              {showPaletteSettings && (
                <div style={styles.floatingPanel}>
                  <div style={styles.floatingPanelHeader}>
                    <div style={styles.floatingPanelTitleGroup}>
                      <Palette size={18} weight="fill" color={colors.bead.cyan} />
                      <div style={styles.floatingPanelTextGroup}>
                        <span style={styles.floatingPanelTitle}>色系设置</span>
                        <span style={styles.floatingPanelSummary}>
                          当前 {colorCount} 色{myColorCount > 0 && <>，我的颜色 {myColorCount}</>}
                        </span>
                      </div>
                    </div>
                    <div style={styles.floatingPanelActions}>
                      <button style={styles.floatingPanelCloseBtn} onClick={() => setShowPaletteSettings(false)}>
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={styles.colorCountTabs}>
                    {colorCountOptions.map((opt) => (
                      <button
                        key={opt.count}
                        style={{
                          ...styles.colorCountTab,
                          ...(colorCount === opt.count ? styles.colorCountTabActive : {}),
                        }}
                        onClick={() => setColorCount(opt.count)}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <div style={styles.paletteSettingsHint}>
                    {currentColorOption?.description} ? {currentColorOption?.detailDesc}
                  </div>

                  <div style={styles.paletteSwitchRow}>
                    <div style={styles.paletteSwitchInfo}>
                      <span style={styles.paletteSwitchTitle}>我的颜色</span>
                      {myColorCount > 0 && (
                        <span style={styles.paletteSwitchBadge}>{myColorCount} 色</span>
                      )}
                    </div>
                    <div style={styles.paletteSwitchActions}>
                      <button style={styles.paletteManageBtn} onClick={() => setShowMyColorsModal(true)}>
                        管理
                      </button>
                      <button
                        style={{
                          ...styles.paletteUseBtn,
                          ...(useMyColors ? styles.paletteUseBtnActive : {}),
                        }}
                        onClick={handleToggleMyColors}
                      >
                        {useMyColors ? '已启用' : '启用'}
                      </button>
                    </div>
                  </div>

                  <button style={styles.applyPaletteBtn} onClick={handleApplyCurrentColorSettings}>
                    应用当前色系设置
                  </button>
                </div>
              )}

              {showStats && (
                <div style={styles.floatingPanel}>
                  <div style={styles.floatingPanelHeader}>
                    <div style={styles.floatingPanelTitleGroup}>
                      <ListBullets size={18} weight="fill" color={colors.bead.orange} />
                      <div style={styles.floatingPanelTextGroup}>
                        <span style={styles.floatingPanelTitle}>豆子统计</span>
                        <span style={styles.floatingPanelSummary}>{statistics.length} 种颜色</span>
                      </div>
                    </div>
                    <div style={styles.floatingPanelActions}>
                      <button style={styles.smartMergeBtn} onClick={() => setShowSmartMerge(true)}>
                        智能合并
                      </button>
                      <button style={styles.floatingPanelCloseBtn} onClick={() => setShowStats(false)}>
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={styles.statsOverviewCard}>
                    <div style={styles.statsOverviewRow}>
                      <span style={styles.statsOverviewLabel}>图案尺寸</span>
                      <span style={styles.statsOverviewValue}>{beadData.width} x {beadData.height} = {totalBeads} 颗豆</span>
                    </div>
                    {boardRecommendation && (
                      <div style={styles.statsOverviewRow}>
                        <span style={styles.statsOverviewLabel}>拼豆板建议</span>
                        <div style={styles.boardRecommendation}>
                          <span style={styles.boardBadge}>{boardRecommendation.boardSize} 钉</span>
                          <span style={styles.boardText}>{boardRecommendation.summary}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.floatingStatsList}>
                    {statistics.map((stat, index) => {
                      const colorInfo = getColorDisplayInfo(stat.color);
                      return (
                        <div
                          key={stat.color.id}
                          style={{
                            ...styles.statsItem,
                            ...(highlightedColorId === stat.color.id ? styles.statsItemHighlighted : {}),
                          }}
                          onClick={() => handleStatsColorClick(stat.color)}
                          title={colorInfo.name + ' · ' + stat.color.id + ' · ' + stat.count + ' 颗豆'}
                        >
                          <span style={styles.statsRank}>{index + 1}</span>
                          <div style={{ ...styles.statsColorBox, backgroundColor: stat.color.hex }} />
                          <span style={styles.statsColorName}>{colorInfo.name}</span>
                          <span style={styles.statsColorId}>色号 {stat.color.id}</span>
                          <span style={styles.statsColorCount}>{stat.count}</span>
                          <span style={styles.statsColorPercent}>{stat.percentage.toFixed(1)}%</span>
                          <button
                            style={styles.replaceBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplaceColor(stat.color.id);
                            }}
                          >
                            换色
                          </button>
                          <button
                            style={{
                              ...styles.excludeBtn,
                              ...(excludedColorIds.has(stat.color.id) ? styles.excludeBtnActive : {}),
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExcludeColor(stat.color.id);
                            }}
                            title={excludedColorIds.has(stat.color.id) ? '已排除该颜色' : '排除该颜色'}
                          >
                            {excludedColorIds.has(stat.color.id) ? <CheckCircle size={12} /> : <Prohibit size={12} />}
                          </button>
                          {replacedColors.has(stat.color.id) && (
                            <button
                              style={styles.restoreBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreColor(stat.color.id);
                              }}
                            >
                              还原
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {replacedColors.size > 0 && (
                      <button style={styles.restoreAllBtn} onClick={handleRestoreAll}>
                        还原全部颜色
                      </button>
                    )}

                    {excludedColorIds.size > 0 && (
                      <div style={styles.excludeHint}>
                        已排除 {excludedColorIds.size} 种颜色，重新生成时不会再使用这些颜色。
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {beadData && isEditMode && (

            <div style={{

              ...styles.slidePanel,

              animation: isEditPanelClosing ? 'slideOutToLeft 0.2s ease-in forwards' : 'slideInFromLeft 0.25s ease-out',

            }}>

              <div style={styles.slidePanelHeader}>

                <button

                  style={styles.slidePanelClose}

                  onClick={handleCloseEditPanel}

                >

                  完成
                </button>

              </div>

              <div style={styles.slidePanelTools}>

                {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸樺ジ鈥﹂崹顕呮建闁逞屽墲閻箖姊洪崨濠勨槈闁宦板姂閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓崗鐓庝淮濡炪們鍨虹粙鎴︼綖濠靛绀傜痪鎷岄哺椤?*/}

                <button

                  style={styles.slidePanelColorBtn}

                  onClick={() => setShowColorPicker(true)}

                >

                  <div

                    style={{

                      ...styles.slidePanelColorPreview,

                      backgroundColor: currentColor?.hex || '#ffffff',

                    }}

                  />

                  <span style={styles.slidePanelColorLabel}>

                    {currentColor?.id || '选色'}

                  </span>

                </button>



                {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸樹粙骞夐崫銉х＜閺夊牄鍔屽ù顔锯偓娈垮櫘閸ｏ綁鐛€ｎ亖鏀介柛鈩冪懐閸熷洭姊绘担鍛婅础闁告鍥ㄥ仱闁靛ě鍐ㄧ亰闂佽宕樺畷闈涚暤娓氣偓閻擃偊宕堕妸褉濮囬梺绋匡工椤兘寮婚妶澶婄畳闁圭儤鍨垫慨搴ㄦ⒑?- 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ゅ嵆閳ユ棃宕橀浣镐壕闁挎繂绨肩花缁樸亜閹哄鐏紒杈ㄥ笧缁辨帡濮€閻樺吀妗撴繝娈垮枛閿曘劌鈻嶉敐澶婄闁告洦鍨版儫闂侀潧顧€婵″洭鍩€椤掑嫮鐣烘慨濠冩そ瀹曨偊宕熼棃娑樺婵＄偑鍊ら崢楣冨礂濮椻偓閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕?*/}

                <div style={styles.slidePanelToolGroup}>

                  {[
                    { id: 'brush' as const, icon: '涂', label: '画笔' },
                    { id: 'fill' as const, icon: '灌', label: '填充' },
                    { id: 'eraser' as const, icon: '擦', label: '橡皮' },
                    { id: 'picker' as const, icon: '取', label: '取色' },
                  ].map((tool) => (

                    <button

                      key={tool.id}

                      style={{

                        ...styles.slidePanelToolBtn,

                        ...(currentTool === tool.id ? styles.slidePanelToolBtnActive : {}),

                      }}

                      onClick={() => setCurrentTool(tool.id)}

                    >

                      <span style={styles.slidePanelToolIcon}>{tool.icon}</span>

                      <span style={styles.slidePanelToolLabel}>{tool.label}</span>

                    </button>

                  ))}

                </div>



                {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂?闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂?*/}

                <div style={styles.slidePanelHistoryGroup}>

                  <button

                    style={{

                      ...styles.slidePanelHistoryBtn,

                      opacity: canUndo ? 1 : 0.4,

                    }}

                    onClick={undo}

                    disabled={!canUndo}

                    title="撤销上一步修改"

                  >

                    <ArrowCounterClockwise size={12} weight="bold" />

                  </button>

                  <button

                    style={{

                      ...styles.slidePanelHistoryBtn,

                      opacity: canRedo ? 1 : 0.4,

                    }}

                    onClick={redo}

                    disabled={!canRedo}

                    title="重做上一步修改"

                  >

                    <ArrowClockwise size={12} weight="bold" />

                  </button>

                </div>

                {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗鐎氫即鏌熼搹顐ｅ暗缂侇喛顕ч埥澶娢熼柨瀣垫綌婵犵數鍋涘Λ娆撳礉閺嶎収鏁傞柣鏂垮悑閳锋帒霉閿濆懏鍟為柟顖氱墦閺屾稒绻濋崒婊冪厽閻庤娲橀崝娆忣嚕娴犲鏁冮柣鏃囨腹婢?*/}

                <button

                  style={styles.slidePanelMagicBtn}

                  onClick={handleEnterBackgroundMode}

                  title="进入背景处理模式"

                >

                  <span style={styles.slidePanelToolIcon}>抠</span>

                  <span style={styles.slidePanelToolLabel}>背景</span>

                </button>

              </div>

            </div>

          )}



      </div>



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴?- 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖骞戦幇闈涙缂佺虎鍘搁崑鎾绘⒒娴ｇ瓔娼愰柛搴″悑閹便劑濡舵径濠勶紵閻庡厜鍋撻柛鏇ㄥ墰閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閿旇桨绨??*/}

      <div style={styles.content}>

        {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞?- 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘??*/}
        <div style={styles.controlPanel}>
          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>预览缩放</span>
              <span style={styles.controlValue}>{Math.round(previewZoom.scale * 100)}%</span>
            </div>
            <div style={styles.previewZoomRow}>
              <button style={styles.previewZoomButton} onClick={() => interactiveCanvasRef.current?.zoomOut()} disabled={!beadData}>-</button>
              <input
                type="range"
                min={Math.round(previewZoom.minScale * 100)}
                max={Math.round(previewZoom.maxScale * 100)}
                value={Math.round(previewZoom.scale * 100)}
                onChange={(e) => interactiveCanvasRef.current?.setZoom(Number(e.target.value) / 100)}
                style={styles.previewZoomSlider}
                disabled={!beadData}
              />
              <button style={styles.previewZoomButton} onClick={() => interactiveCanvasRef.current?.zoomIn()} disabled={!beadData}>+</button>
              <button style={styles.previewZoomChip} onClick={() => interactiveCanvasRef.current?.fitToViewport()} disabled={!beadData}>适配</button>
              <button style={styles.previewZoomChip} onClick={() => interactiveCanvasRef.current?.resetToActualSize()} disabled={!beadData}>1:1</button>
            </div>
          </div>

          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>作品宽度</span>
              <span style={styles.controlValue}>{gridSize} 颗</span>
            </div>
            <div style={styles.previewZoomRow}>
              <button style={styles.previewZoomButton} onClick={() => handleAdjustGridSize(-GRID_SIZE_STEP)} disabled={!beadData}>-</button>
              <input
                type="range"
                min={GRID_SIZE_MIN}
                max={GRID_SIZE_MAX}
                step={GRID_SIZE_STEP}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                onMouseUp={handleRegenerate}
                onTouchEnd={handleRegenerate}
                style={styles.previewZoomSlider}
                disabled={!beadData}
              />
              <button style={styles.previewZoomButton} onClick={() => handleAdjustGridSize(GRID_SIZE_STEP)} disabled={!beadData}>+</button>
              <input
                type="number"
                id="editor-grid-size-input"
                name="editor-grid-size"
                min={GRID_SIZE_MIN}
                max={GRID_SIZE_MAX}
                step={GRID_SIZE_STEP}
                inputMode="numeric"
                value={gridSizeInput}
                onChange={(e) => setGridSizeInput(e.target.value)}
                onBlur={handleGridSizeInputCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleGridSizeInputCommit();
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                style={styles.gridSizeNumberInput}
                aria-label="作品宽度输入"
              />
            </div>
            <div style={styles.gridPresetRow}>
              {COMMON_BOARD_WIDTHS.map((preset) => (
                <button
                  key={preset}
                  style={{
                    ...styles.gridPresetChip,
                    ...(gridSize === preset ? styles.gridPresetChipActive : {}),
                  }}
                  onClick={() => handleRegenerateWithGridSize(preset)}
                >
                  {preset}
                </button>
              ))}
              <span style={styles.gridPresetHint}>步长 2，常用板宽可直达</span>
            </div>
            <div style={styles.sliderLabels}>
              <span style={styles.sliderLabelGreen}>流畅</span>
              <span style={styles.sliderLabelYellow}>适中</span>
              <span style={styles.sliderLabelRed}>精细</span>
            </div>
          </div>

          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>颜色风格</span>
              <span style={styles.controlValue}>{saturationBoost === 0 ? '原图' : saturationBoost + '%'}</span>
            </div>
            <div style={styles.gridPresetRow}>
              {SATURATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  style={{
                    ...styles.gridPresetChip,
                    ...(saturationBoost === preset.value ? styles.gridPresetChipActive : {}),
                  }}
                  onClick={() => handleRegenerateWithSaturation(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
              <span style={styles.gridPresetHint}>多数图片先用推荐，再按需要微调</span>
            </div>
            <div style={styles.mergeSliderRow}>
              <span style={styles.mergeLabel}>更接近原图</span>
              <input
                type="range"
                min="0"
                max="30"
                value={saturationBoost}
                onChange={(e) => setSaturationBoost(Number(e.target.value))}
                onMouseUp={handleRegenerate}
                onTouchEnd={handleRegenerate}
                style={styles.slider}
              />
              <span style={styles.mergeLabel}>更鲜亮</span>
            </div>
          </div>

          {lastAiCutoutImageData && (
            <div style={styles.aiCutoutRestoreCard}>
              <div style={styles.aiCutoutRestoreInfo}>
                <span style={styles.controlLabel}>智能抠图结果已应用</span>
                <span style={styles.aiCutoutRestoreHint}>不满意可以一键恢复到抠图前原图</span>
              </div>
              <button
                style={styles.aiCutoutRestoreButton}
                onClick={handleRestoreAiCutoutSource}
              >
                恢复抠图前原图
              </button>
            </div>
          )}
        </div>

        <div style={styles.primaryFlowHint}>
          <Play size={14} weight="fill" />
          <span>完成调整后，点击“保存并开始制作”进入制作模式</span>
        </div>

        <div style={styles.actions}>
          <button style={styles.secondaryBtn} onClick={() => (onBack ? onBack() : navigate('/mobile/create'))}>
            <ArrowClockwise size={18} />
            返回选图
          </button>

          <button
            style={styles.primaryBtn}
            onClick={handleStartMakingClick}
            disabled={!beadData}
          >
            <Play size={18} weight="fill" />
            保存并开始制作
          </button>
        </div>

        <div style={styles.subActions}>
          <button style={styles.ghostLinkBtn} onClick={handleShareClick} disabled={!beadData}>
            <ShareNetwork size={14} />
            <span>分享图纸</span>
          </button>
        </div>

      </div>

      {showColorPicker && (

        <ColorPicker

          colorCount={colorCount}

          selectedColor={currentColor}

          onSelectColor={handleSelectColor}

          onClose={() => setShowColorPicker(false)}

          recentColors={recentColors}

        />

      )}



      <MyColorsModal

        visible={showMyColorsModal}

        onClose={() => setShowMyColorsModal(false)}

        onSave={(selectedIds) => {

          setMyColorCount(selectedIds.length);

          if (selectedIds.length > 0) {

            setUseMyColors(true);

            setActiveCustomColorIds(selectedIds);

          } else {

            setUseMyColors(false);

            setActiveCustomColorIds(undefined);

          }

        }}

      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸樼晫绮╅悢鐓庡耿婵炲棙鍨归悡瀣⒑缁夊棗瀚峰▓鏇㈡煃闁垮鐏撮柟顔肩秺楠炰線骞掗幋婵愮€抽梻浣告惈椤戝棝宕归崸妤€钃熼柨娑樺閸嬫捇鏁愭惔婵囧枤闂佺粯鎸搁崥瀣€冮妷鈺傚€烽柤纰卞墰椤旀帡姊虹拠鈥虫灍缂侇喗鎹囬獮濠囨倷閸濆嫀銊╂煥閺冨倻鎽傚ù鐘欏洦鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊鐎规洘鍔欏畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕?*/}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="登录后再继续"
        message="登录后可保存方案、同步进度并分享图纸。"
      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偠顕ч埀顒佺箞閻涱喗绗熼埀顒勭嵁閹烘绠ｆ繝闈涙－濞笺儵姊婚崒娆戭槮闁圭⒈鍋婇幆澶嬬附缁嬭法鐛ラ梺鍝勭▉閸樺ジ鎷戦悢鍏肩厪濠电偟鍋撳▍鍡涙煕鐎ｎ亜顏柡灞剧☉閳藉顫滈崼婵嗩潬濠电偛顕崢褏鈧碍婢橀～蹇斻偊鐟併倓姹楅梺鍦劋缁诲啴藟閺嶎厽鈷戠紒瀣硶缁犳煡鏌ㄩ弴妯虹仼妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傞獮瀣晜閻ｅ苯骞愰梺璇插嚱缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓?*/}
      <SaveProjectModal
        visible={showSaveModal}
        onSave={handleSaveProject}
        title="保存方案"
        onCancel={() => setShowSaveModal(false)}
        message="给这份拼豆方案起个名字，方便稍后继续制作。"
        loading={isSaving}
        isLoggedIn={isLoggedIn}
      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞?*/}

      {beadData && (

        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          imageData={(() => {
            const canvas = document.createElement('canvas');
            renderBeadsToCanvas(beadData, canvas, 10, true, false);
            return canvas.toDataURL('image/png');
          })()}
          title="分享图纸"
          stats={statistics.map(s => ({
            color: s.color.hex,
            count: s.count,
            name: s.color.nameCN,
          }))}
          gridSize={{ width: beadData.width, height: beadData.height }}
        />

      )}



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖骞戦幇闈涙缂佺虎鍘搁崑鎾绘⒒娴ｇ瓔娼愰柛搴″悑閹便劑濡舵径濠勶紵閻庡厜鍋撻柛鏇ㄥ墰閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閿旇桨绨婚棅顐㈡处閹搁箖宕洪敐鍡樺弿濠电姴鎳忛鐘绘煙閻熸澘顏┑鈩冩倐婵＄兘鏁傞崣銉ф晼婵犵數濮烽。钘壩ｉ崨鏉戠；闁告洦鍘搁崑鎾愁潩椤撶喓鍑￠梺浼欑悼閸忔﹢寮幘缁樺亹闁圭粯甯掔粊顕€姊绘笟鈧褏鎹㈤崱娑樼婵犻潧妫岄弸宥夋煏韫囧鈧牠鍩涢幋锔界厱婵犻潧妫楅鈺呮煃瑜滈崜娆撴偉閻撳海鏆﹂柟鐗堟緲閸愨偓濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷?*/}

      {beadData && (

        <ShoppingListModal

          visible={showShoppingList}

          onClose={() => setShowShoppingList(false)}

          items={statistics.map(s => ({

            id: s.color.id,

            name: s.color.name,

            nameCN: s.color.nameCN,

            hex: s.color.hex,

            count: s.count,

            percentage: s.percentage,

          }))}

          gridSize={{ width: beadData.width, height: beadData.height }}

          brand={dominantBrand}

        />

      )}



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偟顭堟晶鑼偓鍨緲鐎氼噣鍩€椤掑﹦绉甸柛瀣瀹曟瑩鏁撻悩鏂ユ嫼闁荤姴娲犻埀顒冩珪閻忓牆鈹戦悙宸殶闁稿繑锕㈤悰顔跨疀濞戞瑥浜规繛鎾村嚬閸ㄨ鲸鐡忛梻鍌欐祰椤曆呪偓娑掓櫊閹虫繈宕滆缁€濠傗攽閻樺弶鎼愰柦鍐枛閺屾洘绻涢悙顒佺彆闂佺顑呯€氫即寮诲☉妯锋婵鐗嗘慨娑欑箾鐎电甯堕悗姘緲椤繑銈︾憗銈勬睏闂佸湱鍎ょ换鍐夐弽顓熲拺缂佸娉曠粻鏌ユ煥閺囨ê鐏╂い鏇秮椤㈡洟鏁冮埀顒傜不婵犳碍鍋ｉ柛銉戝啰楠囧銈冨劜缁诲牆顫忓ú顏咁棃婵炴垶鑹鹃。鍝勨攽閳藉棗浜濇い銊ワ躬閵?*/}

      {beadData && (

        <SmartMergeModal

          visible={showSmartMerge}

          onClose={() => setShowSmartMerge(false)}

          beadData={beadData}

          onConfirm={(mergedData) => {

            saveToHistory(beadData.beads);

            setBeadData(mergedData);

            setStatistics(calculateBeadStatistics(mergedData));

          }}

        />

      )}



      {/* 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柣鎴ｅГ閸ゅ嫰鏌涢锝嗙缂佹劖顨堥埀顒€绠嶉崕鍗灻洪妸鈺佺婵鍩栭悡娆戠磽娴ｉ潧鐏╅柡瀣枛閺岋綁骞橀崡鐐插Е闂佸搫鐭夌紞浣割嚕椤掑嫬绠伴幖绮瑰墲濞堟﹢姊绘担绛嬪殭婵炲瓨宀稿畷鎶芥晲婢跺﹨鎽曢梺缁樻煥婢瑰﹤危瑜版帒绠圭紒顔煎帨閸嬫捇宕橀懠顒夊悈闂傚倸鍊峰ù鍥ь浖閵娾晜鍊块柨鏇炲€哥粻鏌ユ煕閵夋垵鑻▓銊ヮ渻閵堝棗绗掗悗姘煎墮濞插潡姊绘担铏广€婇柛鎾寸箞閵嗗啳绠涢弬娆惧殼?*/}

      <Modal {...modalProps} />

      <RewardedUnlockModal
        visible={showAiCutoutUnlockModal}
        title="解锁智能抠图"
        desc="观看一次短广告后，可为当前图片解锁一次智能抠图。"
        onClose={() => {
          setShowAiCutoutUnlockModal(false);
          pendingAiCutoutAfterRewardRef.current = null;
        }}
        onRewardEarned={() => {
          adService.grantAiCutoutRewardCredit();
          const pendingAction = pendingAiCutoutAfterRewardRef.current;
          pendingAiCutoutAfterRewardRef.current = null;
          pendingAction?.();
        }}
      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼鐔锋疂闂佺绻愰幗婊呯不濮橆剦娓婚柕鍫濇婢ь剟鏌曢崶銊ф创鐎规洘鍨块獮妯虹暦閸ャ劍顔曢梻浣规偠閸庮噣寮查埡鍛哗闁靛ň鏅滈埛鎺楁煕鐏炲墽鎳勭紒浣哄缁绘稒寰勭€ｎ偆顦伴悗瑙勬磻閸楁娊鐛崶顒€绾ч柛顭戝枛濞堛倕鈹戦悩鍨毄濠殿喚鏁婚幊婵嬪礈瑜忔稉宥嗐亜閺嶎偄浠﹂柣鎾跺枛閺岀喐娼忛崜褍鍩岄悶姘哺濮婃椽宕崟顒€娅ら梺璇″枛閸婂灝顕ｆ繝姘櫢闁绘灏欓敍婊冣攽閳藉棗鐏ラ柕鍡忓亾闂佺顑嗛幑鍥ь嚕娴犲鏁冮柣鏃囨腹婢??*/}

      {isBackgroundMode && beadData && bgPreviewBeadData && (
        <div style={styles.bgModeOverlay}>
          <div style={styles.bgModeHeader}>
            <button style={styles.bgModeBackBtn} onClick={handleExitBackgroundMode}>
              <ArrowLeft size={18} weight="bold" />
            </button>
            <span style={styles.bgModeTitle}>背景处理模式</span>
            <span style={styles.bgModeCount}>
              {bgSelectionSource === 'auto'
                ? '已圈出 ' + getBgHighlightedIndices().length + ' 格背景'
                : bgSelectedColorId
                  ? '已选中 ' + getBgHighlightedIndices().length + ' 格'
                  : '点击格子选择背景色'}
            </span>
          </div>

          <div style={styles.bgModeStrengthSection}>
            <div style={styles.bgModeStrengthHeader}>
              <span style={styles.controlLabel}>识别强度</span>
              <span style={styles.bgModeStrengthValue}>
                {bgAutoStrength < 40 ? '保守' : bgAutoStrength > 70 ? '激进' : '推荐'} 档
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={bgAutoStrength}
              onChange={(e) => setBgAutoStrength(Number(e.target.value))}
              style={{
                ...styles.slider,
                background:
                  'linear-gradient(to right, ' + colors.bead.cyan + ' 0%, ' + colors.bead.green + ' 45%, ' + colors.bead.yellow + ' 72%, ' + colors.bead.orange + ' 100%)',
              }}
            />
            <div style={styles.bgModeStrengthLabels}>
              <span>更保守</span>
              <span>更激进</span>
            </div>
          </div>

          <div style={styles.bgModeFilterRow}>
            <button
              style={{
                ...styles.bgModeFilterBtn,
                ...(bgProtectSubject ? styles.bgModeFilterBtnActive : {}),
              }}
              onClick={() => setBgProtectSubject((prev) => !prev)}
            >
              主体保护：{bgProtectSubject ? '已开启' : '已关闭'}
            </button>
          </div>

          <div style={styles.bgModeFilterRow}>
            <button
              style={{
                ...styles.bgModeFilterBtn,
                ...(bgCandidateOnly ? styles.bgModeFilterBtnActive : {}),
              }}
              onClick={() => setBgCandidateOnly((prev) => !prev)}
            >
              {bgCandidateOnly ? '显示全部区域' : '只看背景候选区'}
            </button>
          </div>

          <div style={styles.bgModeCompareRow}>
            <button
              style={{
                ...styles.bgModeCompareBtn,
                ...(isBgComparingBefore ? styles.bgModeCompareBtnActive : {}),
                opacity: bgBaselineData ? 1 : 0.45,
              }}
              onClick={() => setBgCompareMode((prev) => (prev === 'before' ? 'current' : 'before'))}
              disabled={!bgBaselineData}
            >
              {isBgComparingBefore ? '查看当前结果' : '查看去背景前'}
            </button>
          </div>

          <div style={styles.bgModeFilterRow}>
            <button
              style={{
                ...styles.bgModeFilterBtn,
                ...(bgViewMode === 'view' ? styles.bgModeFilterBtnActive : {}),
                flex: 1,
              }}
              onClick={() => handleBgSwitchMode('view')}
            >
              {bgViewMode === 'view' ? '重新选择' : '查看当前选择'}
            </button>
            <button
              style={{
                ...styles.bgModeFilterBtn,
                ...(bgViewMode === 'erase' ? styles.bgModeFilterBtnActive : {}),
                flex: 1,
              }}
              onClick={() => handleBgSwitchMode('erase')}
            >
              {bgViewMode === 'erase' ? '结束手动擦背景' : '手动擦背景'}
            </button>
            <button
              style={{
                ...styles.bgModeFilterBtn,
                ...(bgViewMode === 'restore' ? styles.bgModeFilterBtnActive : {}),
                flex: 1,
              }}
              onClick={() => handleBgSwitchMode('restore')}
            >
              {bgViewMode === 'restore' ? '结束手动补背景' : '手动补背景'}
            </button>
          </div>

          <div style={styles.bgModePreview}>
            <InteractiveCanvas
              beadData={bgPreviewBeadData}
              cellSize={cellSize}
              currentTool="picker"
              currentColor={null}
              isEditMode={!isBgComparingBefore && bgViewMode !== 'view'}
              highlightedColorId={isBgComparingBefore ? null : bgSelectedColorId}
              bgModeHighlightedIndices={isBgComparingBefore ? [] : getBgHighlightedIndices()}
              bgModeExcludedIndices={isBgComparingBefore ? new Set<number>() : bgExcludedIndices}
              bgModeRecoverableIndices={isBgComparingBefore ? new Set<number>() : bgRecoverableIndices}
              bgCandidateOnly={!isBgComparingBefore && bgCandidateOnly}
              isBackgroundMode={true}
              bgViewMode={isBgComparingBefore ? 'view' : bgViewMode}
              onBgSelectColor={handleBgSelectColor}
              onBgToggleExclude={handleBgToggleExclude}
              onBgRestoreCell={handleBgRestoreSingleCell}
              onBgManualErase={handleBgManualEraseCell}
              onBeadClick={() => {}}
              onBeadDrag={() => {}}
              onDragEnd={() => {}}
              onPickColor={() => {}}
            />
          </div>

          <div style={styles.bgModeHint}>
            {bgDetectionMessage && (
              <p style={styles.bgModeDetectionText}>{bgDetectionMessage}</p>
            )}

            {isBgComparingBefore && (
              <p style={styles.bgModeCompareHint}>当前正在查看去背景前快照，便于和当前结果对比。</p>
            )}

            {bgLastRemoval.length > 0 && (
              <p style={styles.bgModeRecoveryHint}>虚线框表示可恢复的误删背景格，点格子可逐个恢复。</p>
            )}

            {isBgComparingBefore ? (
              <p>对比模式：这是去背景前的原始状态，只用于查看，不会修改图案。</p>
            ) : bgViewMode === 'view' ? (
              <p>查看模式下不会修改图案，切回选择模式可继续微调。</p>
            ) : bgViewMode === 'erase' ? (
              <p>手动擦背景已开启，点击任意格子即可直接透明化。</p>
            ) : bgViewMode === 'restore' ? (
              <p>手动补背景已开启，点击透明格即可从去背景前状态补回。</p>
            ) : !bgSelectedColorId ? (
              <p>点击任意格子，选择要透明化的背景颜色。</p>
            ) : (
              <p>再次点击可排除误选区域，确认无误后再透明化。</p>
            )}
          </div>

          <div style={styles.bgModeActions}>
            <button style={styles.bgModeQuickBtn} onClick={handleBgQuickRemove}>
              一键去背景
            </button>
            <button style={styles.bgModeAiBtn} onClick={handleBgAiCutout} disabled={isBgAiCutoutLoading}>
              {isBgAiCutoutLoading ? '智能抠图中...' : '智能抠图'}
            </button>
            {bgLastRemoval.length > 0 && (
              <button style={styles.bgModeRestoreBtn} onClick={handleBgRestoreLastRemoval}>
                恢复上次去背景
              </button>
            )}
            <button style={styles.bgModeClearBtn} onClick={handleBgClearSelection}>
              清空选择
            </button>
            <button
              style={styles.bgModeConfirmBtn}
              onClick={handleBgConfirmTransparent}
              disabled={getBgHighlightedIndices().length === 0}
            >
              确认透明
            </button>
            <button style={styles.bgModeExitBtn} onClick={handleExitBackgroundMode}>
              退出
            </button>
          </div>
        </div>
      )}


    </div>

  );

};



const styles: Record<string, React.CSSProperties> = {

  container: {

    height: '100vh',

    display: 'flex',

    flexDirection: 'column',

    background: colors.bg.primary,

    overflowY: 'auto',

    overflowX: 'hidden',

    overscrollBehaviorX: 'none',

  },




  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: colors.bg.secondary,
    borderBottom: '1px solid ' + colors.border.soft,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },



  headerSpacer: {

    height: '50px',

  },



  backBtn: {

    ...mixins.backButton,

  },



  title: {

    fontSize: typography.fontSize.lg,

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    background: colors.gradients.primary,

    WebkitBackgroundClip: 'text',

    WebkitTextFillColor: 'transparent',

    backgroundClip: 'text',

    margin: 0,

  },




  headerPlaceholder: {

    width: '40px',

    height: '40px',

  },




  previewSection: {

    padding: '8px 12px 6px',

    background: colors.bg.secondary,

    borderBottom: '1px solid ' + colors.border.soft,

    position: 'sticky',

    top: '50px', // header 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮欓浣典户闂佽桨绀侀崐褰掑Φ閸曨喚鐤€闁圭偓鎯屽Λ鈩冪節濞堝灝鐏犻柕鍫熸倐楠炲啫鐣￠幍铏€婚棅顐㈡处閹尖晜绂掗悡搴富?

    zIndex: 98,

  },



  toolbarWrapper: {

    padding: '6px 10px',

    background: colors.bg.secondary,

    borderBottom: '1px solid ' + colors.border.soft,

  },



  content: {

    flex: 'none',

    padding: '8px 12px',

    overscrollBehaviorX: 'none',

  },



  loadingBox: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '60px 20px',

    background: colors.bg.card,

    borderRadius: radius.card,

    gap: '12px',

  },



  loadingSpinner: {

    width: '40px',

    height: '40px',

    border: "3px solid " + colors.bead.cyan + "30",

    borderTopColor: colors.bead.cyan,

    borderRadius: '50%',

    animation: 'spin 1s linear infinite',

  },



  loadingText: {

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

    margin: 0,

  },



  infoRow: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: '8px',

    padding: '0 4px',

  },




  sizeInfoGroup: {

    display: 'flex',

    flexDirection: 'column',

    gap: '4px',

  },



  sizeInfo: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

  },



  boardRecommendation: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

  },



  boardBadge: {

    padding: '2px 6px',

    background: "linear-gradient(135deg, " + colors.bead.cyan + "40, " + colors.bead.purple + "40)",

    borderRadius: radius.bead,

    fontSize: '10px',

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.cyan,

  },



  boardText: {

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

  },



  editModeBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '3px',

    padding: '4px 8px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    cursor: 'pointer',

    transition: animation.transition.fast,

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

    flexShrink: 0,

  },



  editModeBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.orange + ", " + colors.bead.red + ")",

    border: '1px solid ' + colors.bead.orange,

    color: '#ffffff',

    boxShadow: "0 0 6px " + colors.bead.orange + "50",

  },




  floatingEditBtn: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '36px',

    height: '36px',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.bead.purple + ")",

    border: 'none',

    borderRadius: radius.bead,

    color: '#ffffff',

    cursor: 'pointer',

    boxShadow: "0 2px 8px " + colors.bead.cyan + "50",

    zIndex: 10,
    transition: animation.transition.fast,
  },

  floatingUtilityStack: {
    position: 'absolute',
    top: '52px',
    left: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 11,
  },

  floatingUtilityBtn: {
    width: '36px',
    height: '36px',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.bead.purple + ")",
    color: '#ffffff',
    border: 'none',
    borderRadius: radius.bead,
    boxShadow: "0 2px 8px " + colors.bead.cyan + "50",
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  floatingUtilityBtnActive: {
    background: "linear-gradient(145deg, " + colors.bead.orange + ", " + colors.bead.red + ")",
    boxShadow: "0 2px 8px " + colors.bead.orange + "50",
  },

  floatingUtilityLabel: {
    fontSize: '7px',
    fontFamily: typography.fontFamilyAlt,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 1,
  },

  floatingPanel: {
    position: 'absolute',
    top: '8px',
    left: '62px',
    right: '8px',
    maxHeight: 'calc(100% - 16px)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'rgba(14, 20, 39, 0.94)',
    border: '1px solid ' + colors.border.soft,
    borderRadius: radius.card,
    boxShadow: shadows.lg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    overflow: 'hidden',
    zIndex: 12,
  },

  floatingPanelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },

  floatingPanelTitleGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    minWidth: 0,
  },

  floatingPanelTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },

  floatingPanelTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },

  floatingPanelSummary: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
  },

  floatingPanelActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },

  floatingPanelCloseBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid ' + colors.border.soft,
    borderRadius: radius.bead,
    color: colors.text.secondary,
    cursor: 'pointer',
    flexShrink: 0,
  },

  statsOverviewCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid ' + colors.border.soft,
    borderRadius: radius.button,
  },

  statsOverviewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },

  statsOverviewLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
  },

  statsOverviewValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },

  floatingStatsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    paddingRight: '2px',
  },


  slidePanel: {

    position: 'absolute',

    top: '8px',

    left: '8px',

    width: '52px',

    background: 'rgba(30, 30, 40, 0.75)',

    backdropFilter: 'blur(12px)',

    WebkitBackdropFilter: 'blur(12px)',

    borderRadius: radius.card,

    boxShadow: shadows.lg,

    border: '1px solid rgba(255, 255, 255, 0.1)',

    display: 'flex',

    flexDirection: 'column',

    zIndex: 20,

    overflow: 'hidden',

  },



  slidePanelHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '4px',

    borderBottom: "1px solid rgba(255,255,255,0.1)",

  },



  slidePanelTitle: {

    fontSize: '9px',

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.bold,

    color: colors.text.secondary,

  },



  slidePanelClose: {

    width: '20px',

    height: '20px',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: 'rgba(255, 255, 255, 0.15)',

    border: 'none',

    borderRadius: '50%',

    color: '#ffffff',

    fontSize: '10px',

    cursor: 'pointer',

  },



  slidePanelTools: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    padding: '6px 4px',

    gap: '4px',

  },



  slidePanelColorBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '2px',

    padding: '4px',

    background: 'transparent',

    border: 'none',

    cursor: 'pointer',

  },



  slidePanelColorPreview: {

    width: '24px',

    height: '24px',

    borderRadius: radius.bead,

    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",

    border: '2px solid rgba(255,255,255,0.3)',

  },



  slidePanelColorLabel: {

    fontSize: '7px',

    fontFamily: typography.fontFamilyAlt,

    color: '#ffffff',

  },



  slidePanelToolGroup: {

    display: 'flex',

    flexDirection: 'column',

    gap: '4px',

    width: '100%',

  },



  slidePanelToolBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '1px',

    padding: '4px 2px',

    background: 'rgba(255, 255, 255, 0.1)',

    border: 'none',

    borderRadius: radius.bead,

    cursor: 'pointer',

    transition: animation.transition.fast,

  },



  slidePanelToolBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.bead.cyan + "cc)",

    boxShadow: "0 0 8px " + colors.bead.cyan + "50",

  },



  slidePanelToolIcon: {

    fontSize: '14px',

  },



  slidePanelToolLabel: {

    fontSize: '7px',

    fontFamily: typography.fontFamilyAlt,

    color: '#ffffff',

  },



  slidePanelHistoryGroup: {

    display: 'flex',

    gap: '2px',

    marginTop: '4px',

    justifyContent: 'center',

    width: '100%',

  },



  slidePanelHistoryBtn: {

    width: '16px',

    height: '16px',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: 'rgba(255, 255, 255, 0.15)',

    border: 'none',

    borderRadius: '4px',

    color: '#ffffff',

    cursor: 'pointer',

  },



  slidePanelMagicBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '1px',

    padding: '4px 2px',

    background: "linear-gradient(145deg, " + colors.bead.yellow + ", " + colors.bead.orange + ")",

    border: 'none',

    borderRadius: radius.bead,

    cursor: 'pointer',

    width: '100%',

  },



  controlPanel: {

    background: colors.bg.card,

    borderRadius: radius.card,

    padding: '10px',

    marginBottom: '8px',

    boxShadow: shadows.sm,

    border: '1px solid ' + colors.border.soft,

  },



  previewZoomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },

  previewZoomButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: radius.bead,
    background: colors.bg.tertiary,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    cursor: 'pointer',
    flexShrink: 0,
  },

  previewZoomSlider: {
    flex: 1,
    minWidth: '120px',
  },

  previewZoomChip: {
    padding: '7px 10px',
    border: '1px solid ' + colors.border.soft,
    borderRadius: radius.button,
    background: colors.bg.tertiary,
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    flexShrink: 0,
  },

  controlItem: {

    marginBottom: '8px',

  },



  controlHeader: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

    marginBottom: '8px',

  },



  controlLabel: {

    flex: 1,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.primary,

  },



  controlValue: {

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.cyan,

    fontWeight: typography.fontWeight.bold,

  },

  gridSizeControlRow: {

    display: 'grid',

    gridTemplateColumns: '40px minmax(0, 1fr) 40px 64px',

    alignItems: 'center',

    gap: '8px',

  },

  gridSizeSlider: {

    minWidth: 0,

  },

  gridSizeStepBtn: {

    minWidth: '40px',

    height: '40px',

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    background: colors.bg.tertiary,

    color: colors.text.primary,

    fontSize: typography.fontSize.lg,

    fontWeight: typography.fontWeight.bold,

    cursor: 'pointer',

  },

  gridSizeNumberInput: {

    width: '64px',

    height: '40px',

    padding: '0 8px',

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    background: colors.bg.tertiary,

    color: colors.text.primary,

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.bold,

    textAlign: 'center',

    outline: 'none',

  },

  gridPresetRow: {

    display: 'flex',

    alignItems: 'center',

    flexWrap: 'wrap',

    gap: '8px',

    marginTop: '10px',

  },

  gridPresetChip: {

    minWidth: '48px',

    height: '32px',

    padding: '0 10px',

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    background: colors.bg.tertiary,

    color: colors.text.secondary,

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.semibold,

    cursor: 'pointer',

  },

  gridPresetChipActive: {

    background: colors.gradients.primary,

    border: '1px solid ' + colors.bead.cyan,

    color: '#ffffff',

    boxShadow: "0 4px 12px " + colors.bead.cyan + "30",

  },

  gridPresetHint: {

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

  },



  slider: {

    width: '100%',

    height: '6px',

    WebkitAppearance: 'none',

    appearance: 'none',

    background: colors.bg.tertiary,

    borderRadius: radius.full,

    outline: 'none',

    cursor: 'pointer',

    touchAction: 'pan-y',

  },



  performanceWarning: {

    marginTop: '4px',

    padding: '4px 8px',

    background: colors.bead.orange + "20",

    borderRadius: radius.bead,

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.orange,

    textAlign: 'center',

  },



  sliderLabels: {

    display: 'flex',

    justifyContent: 'space-between',

    marginTop: '4px',

    fontSize: '9px',

    fontFamily: typography.fontFamilyAlt,

  },



  sliderLabelGreen: {

    color: colors.bead.cyan,

  },



  sliderLabelYellow: {

    color: colors.bead.yellow,

  },



  sliderLabelRed: {

    color: '#ff6b6b',

  },



  paletteSettingsCard: {

    marginTop: '12px',

    padding: '12px',

    borderRadius: radius.card,

    background: "linear-gradient(145deg, " + colors.bead.purple + "12, " + colors.bg.tertiary + ")",

    border: '1px solid ' + colors.border.soft,

  },



  paletteSettingsToggle: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: '10px',

    background: 'transparent',

    border: 'none',

    color: colors.text.primary,

    cursor: 'pointer',

    padding: 0,

  },



  paletteSettingsToggleLeft: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'flex-start',

    gap: '2px',

  },



  paletteSettingsTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    color: colors.text.primary,

  },



  paletteSettingsSummary: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

  },



  paletteSettingsBody: {

    display: 'flex',

    flexDirection: 'column',

    gap: '12px',

    marginTop: '12px',

  },



  paletteSettingsHint: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

  },



  paletteSwitchRow: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: '10px',

  },



  paletteSwitchInfo: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

    flexWrap: 'wrap',

  },



  paletteSwitchTitle: {

    fontSize: typography.fontSize.sm,

    color: colors.text.primary,

  },



  paletteSwitchBadge: {

    padding: '2px 8px',

    borderRadius: radius.pill,

    background: colors.bead.cyan + "20",

    color: colors.bead.cyan,

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteSwitchActions: {

    display: 'flex',

    gap: '8px',

  },



  paletteManageBtn: {

    padding: '6px 10px',

    borderRadius: radius.button,

    border: '1px solid ' + colors.border.soft,

    background: colors.bg.tertiary,

    color: colors.text.secondary,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteUseBtn: {

    padding: '6px 10px',

    borderRadius: radius.button,

    border: '1px solid ' + colors.border.soft,

    background: colors.bg.tertiary,

    color: colors.text.secondary,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteUseBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "28, " + colors.bead.cyan + "12)",

    border: '1px solid ' + colors.bead.cyan,

    color: colors.bead.cyan,

  },



  paletteApplyBtn: {

    width: '100%',

    padding: '10px 12px',

    borderRadius: radius.button,

    border: 'none',

    background: "linear-gradient(145deg, " + colors.bead.purple + ", " + colors.bead.cyan + ")",

    color: colors.text.primary,

    cursor: 'pointer',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    boxShadow: shadows.button,

  },



  colorCountTabs: {

    display: 'flex',

    gap: '6px',

  },



  colorCountTab: {

    flex: 1,

    padding: '6px 2px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

    transition: animation.transition.fast,

  },



  colorCountTabActive: {

    background: "linear-gradient(145deg, " + colors.bead.purple + "30, " + colors.bead.purple + "15)",

    border: '1px solid ' + colors.bead.purple,

    color: colors.bead.purple,

  },




  mergeSliderRow: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  mergeLabel: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    whiteSpace: 'nowrap',

  },



  mergeHint: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    margin: '6px 0 0',

    textAlign: 'center',

  },

  aiCutoutRestoreCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 12px',
    marginTop: '8px',
    borderRadius: radius.button,
    background: "linear-gradient(145deg, " + colors.bead.yellow + "14, " + colors.bead.orange + "10)",
    border: "1px solid " + colors.bead.yellow + "35",
  },

  aiCutoutRestoreInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },

  aiCutoutRestoreHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    lineHeight: 1.5,
  },

  aiCutoutRestoreButton: {
    flexShrink: 0,
    padding: '8px 12px',
    borderRadius: radius.button,
    border: 'none',
    background: "linear-gradient(145deg, " + colors.bead.orange + ", " + colors.bead.yellow + ")",
    color: '#ffffff',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.button,
  },



  statsSection: {

    background: colors.bg.card,

    borderRadius: radius.card,

    marginBottom: '8px',

    boxShadow: shadows.sm,

    border: '1px solid ' + colors.border.soft,

    overflow: 'hidden',

  },



  statsHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    width: '100%',

    padding: '8px 10px',

    background: 'transparent',

    border: 'none',

    cursor: 'pointer',

  },



  statsHeaderLeft: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  statsHeaderRight: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  smartMergeBtn: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 8px',

    background: "linear-gradient(145deg, " + colors.bead.purple + "20, " + colors.bead.purple + "10)",

    border: "1px solid " + colors.bead.purple + "50",

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.purple,

    transition: animation.transition.fast,

  },



  shoppingListBtn: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 8px',

    background: "linear-gradient(145deg, " + colors.bead.green + "20, " + colors.bead.green + "10)",

    border: "1px solid " + colors.bead.green + "50",

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.green,

    transition: animation.transition.fast,

  },



  statsTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.primary,

  },



  statsCount: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    padding: '2px 8px',

    background: colors.bg.tertiary,

    borderRadius: radius.full,

  },



  statsArrow: {

    fontSize: '10px',

    color: colors.text.muted,

    transition: animation.transition.fast,

  },



  statsList: {

    padding: '0 8px 8px',

    maxHeight: '200px',

    overflowY: 'auto',

  },



  statsItem: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 0',

    borderBottom: '1px solid ' + colors.border.soft,

    cursor: 'pointer',

    transition: animation.transition.fast,

  },




  statsItemHighlighted: {

    background: "linear-gradient(145deg, " + colors.bead.yellow + "20, " + colors.bead.yellow + "10)",

    borderColor: colors.bead.yellow,

    borderRadius: '4px',

    padding: '4px 4px',

    margin: '0 -4px',

  },



  statsRank: {

    width: '16px',

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    textAlign: 'center',

  },




  statsColorBox: {

    width: '16px',

    height: '16px',

    borderRadius: '4px',

    flexShrink: 0,

  },




  statsColorId: {

    fontSize: '9px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    minWidth: '48px',

    flexShrink: 0,

  },



  statsColorName: {

    flex: 1,

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.primary,

    overflow: 'hidden',

    textOverflow: 'ellipsis',

    whiteSpace: 'nowrap',

  },



  statsColorCount: {

    fontSize: '11px',

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.primary,

    minWidth: '28px',

    textAlign: 'right',

  },



  statsColorPercent: {

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

    minWidth: '32px',

    textAlign: 'right',

  },




  replaceBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 6px',

    marginLeft: '2px',

    background: "linear-gradient(145deg, " + colors.bead.cyan + "20, " + colors.bead.cyan + "10)",

    border: "1px solid " + colors.bead.cyan + "50",

    borderRadius: '4px',

    cursor: 'pointer',

    fontSize: '10px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.cyan,

    transition: animation.transition.fast,

    whiteSpace: 'nowrap',

  },




  restoreBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 6px',

    marginLeft: '2px',

    background: "linear-gradient(145deg, " + colors.bead.orange + "20, " + colors.bead.orange + "10)",

    border: "1px solid " + colors.bead.orange + "50",

    borderRadius: '4px',

    cursor: 'pointer',

    fontSize: '10px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.orange,

    transition: animation.transition.fast,

    whiteSpace: 'nowrap',

  },




  restoreAllBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    width: '100%',

    padding: '6px',

    marginTop: '6px',

    background: "linear-gradient(145deg, " + colors.bead.purple + "20, " + colors.bead.purple + "10)",

    border: "1px solid " + colors.bead.purple + "50",

    borderRadius: '6px',

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.purple,

    transition: animation.transition.fast,

  },




  excludeBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 4px',

    marginLeft: '2px',

    background: 'transparent',

    border: "1px solid " + colors.text.muted + "30",

    borderRadius: '4px',

    cursor: 'pointer',

    color: colors.text.muted,

    transition: animation.transition.fast,

  },



  excludeBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.red + "20, " + colors.bead.red + "10)",

    border: "1px solid " + colors.bead.red + "50",

    color: colors.bead.red,

  },




  excludeHint: {

    width: '100%',

    padding: '6px 8px',

    marginTop: '6px',

    background: colors.bead.red + "10",

    borderRadius: '6px',

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.red,

    textAlign: 'center',

  },



  actions: {

    display: 'flex',

    gap: '6px',

    paddingBottom: '6px',

  },



  primaryFlowHint: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '6px',

    padding: '6px 10px',

    marginBottom: '8px',

    background: colors.bead.cyan + "12",

    border: "1px solid " + colors.bead.cyan + "30",

    borderRadius: radius.button,

    color: colors.bead.cyan,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.medium,

    fontFamily: typography.fontFamilyAlt,

  },



  subActions: {

    display: 'flex',

    justifyContent: 'center',

    paddingBottom: '12px',

  },



  ghostLinkBtn: {

    display: 'inline-flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 10px',

    background: 'transparent',

    border: 'none',

    color: colors.text.muted,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.medium,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    transition: animation.transition.fast,

  },



  secondaryBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '4px',

    padding: '8px 6px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.primary,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.sm,

    transition: animation.transition.fast,

  },



  primaryBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '4px',

    padding: '8px 6px',

    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.pixel.blue + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button + ", " + shadows.glow.cyan,

    transition: animation.transition.fast,

  },




  bgModeOverlay: {

    position: 'fixed',

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    background: colors.bg.primary,

    zIndex: 200,

    display: 'flex',

    flexDirection: 'column',

  },



  bgModeHeader: {

    display: 'flex',

    alignItems: 'center',

    padding: '12px 16px',

    background: "linear-gradient(145deg, " + colors.bead.magenta + "20, " + colors.bead.purple + "20)",

    borderBottom: "1px solid " + colors.bead.magenta + "40",

    gap: '12px',

  },



  bgModeBackBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    width: '36px',

    height: '36px',

    background: colors.bg.card,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.primary,

    cursor: 'pointer',

  },



  bgModeTitle: {

    fontSize: typography.fontSize.md,

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.magenta,

  },



  bgModeCount: {

    marginLeft: 'auto',

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

    padding: '4px 10px',

    background: colors.bg.card,

    borderRadius: radius.full,

  },



  bgModePreview: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '16px',

    overflow: 'auto',

  },



  bgModeHint: {

    padding: '8px 16px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

    textAlign: 'center',

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

  },

  bgModeDetectionText: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.sm,

    lineHeight: 1.5,

    color: colors.bead.cyan,

  },

  bgModeRecoveryHint: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.xs,

    lineHeight: 1.5,

    color: colors.bead.green,

  },

  bgModeCompareHint: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.xs,

    lineHeight: 1.5,

    color: colors.bead.yellow,

  },

  bgModeStrengthSection: {

    padding: '12px 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeStrengthHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: '8px',

  },

  bgModeStrengthValue: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.secondary,

  },

  bgModeStrengthLabels: {

    display: 'flex',

    justifyContent: 'space-between',

    marginTop: '6px',

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.text.muted,

  },

  bgModeFilterRow: {

    padding: '0 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeFilterBtn: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '10px 12px',

    background: colors.bg.tertiary,

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.secondary,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModeFilterBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "25, " + colors.bead.green + "18)",

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.bead.cyan,

    color: colors.bead.cyan,

  },

  bgModeCompareRow: {

    padding: '0 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeCompareBtn: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '10px 12px',

    background: colors.bg.tertiary,

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.secondary,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModeCompareBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.yellow + "22, " + colors.bead.orange + "18)",

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.bead.yellow,

    color: colors.bead.yellow,

  },

  aiCutoutStatusContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
  },

  aiCutoutStatusParagraph: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.7,
    color: colors.text.secondary,
  },

  aiCutoutStatusCard: {
    padding: '12px',
    borderRadius: radius.button,
    background: colors.bg.tertiary,
    border: '1px solid ' + colors.border.soft,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  aiCutoutStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },

  aiCutoutStatusLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
  },

  aiCutoutStatusValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'right',
  },

  aiCutoutStatusNext: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
    color: colors.bead.cyan,
  },



  bgModeActions: {

    display: 'flex',

    flexWrap: 'wrap',

    gap: '6px',

    padding: '12px 16px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeQuickBtn: {

    flex: '1 1 calc(50% - 3px)',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: "linear-gradient(145deg, " + colors.bead.green + ", " + colors.bead.cyan + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button,

  },

  bgModeAiBtn: {

    flex: '1 1 calc(50% - 3px)',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: "linear-gradient(145deg, " + colors.bead.yellow + ", " + colors.bead.orange + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button,

  },

  bgModeRestoreBtn: {

    flex: '1 1 100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.bead.green + '50',

    borderRadius: radius.button,

    color: colors.bead.green,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },



  bgModeToggleBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px 14px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.secondary,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    flexShrink: 0,

  },



  bgModeToggleBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "30, " + colors.bead.cyan + "10)",

    border: '1px solid ' + colors.bead.cyan,

    color: colors.bead.cyan,

  },



  bgModeClearBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.secondary,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },



  bgModeConfirmBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: "linear-gradient(145deg, " + colors.bead.magenta + ", " + colors.bead.purple + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button,

  },



  bgModeExitBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px',

    background: colors.bg.tertiary,

    border: '1px solid ' + colors.border.soft,

    borderRadius: radius.button,

    color: colors.text.primary,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

};




const styleSheet = document.createElement('style');

styleSheet.textContent = '\n  @keyframes spin {\n    to { transform: rotate(360deg); }\n  }\n';

if (!document.querySelector('#editor-styles')) {

  styleSheet.id = 'editor-styles';

  document.head.appendChild(styleSheet);

}



export default EditorPage;




