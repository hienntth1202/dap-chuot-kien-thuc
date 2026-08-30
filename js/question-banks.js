import { filterQuestionsByDifficulty, normalizeQuestionCount, seededShuffle } from './engine.js';

export const QUESTION_BANKS = {
  derivative_general: {
    id: 'derivative_general',
    subject: 'Toán',
    title: 'Công thức đạo hàm tổng quát',
    instruction: 'Chọn công thức đạo hàm tổng quát đúng:',
    description: 'Quy tắc tổng, tích, thương và các công thức đạo hàm tổng quát với u=u(x), v=v(x).',
    questions: [
      q('DG01', "(u+v)'=?", "u'+v'", ["u'v'", 'u+v', "u'-v'"], 1, 'Quy tắc tổng'),
      q('DG02', "(ku)'=?,\\quad k\\text{ là hằng số}", "ku'", ["k'u", 'ku', "u'"], 1, 'Nhân hằng số'),
      q('DG03', "(C)'=?", '0', ['C', '1', "C'"], 1, 'Hằng số'),
      q('DG04', "(x^\\alpha)'=?,\\quad \\alpha\\in\\mathbb{R}", '\\alpha x^{\\alpha-1}', ['(\\alpha-1)x^{\\alpha}', '\\alpha x^{\\alpha}', 'x^{\\alpha-1}'], 1, 'Lũy thừa'),
      q('DG05', "(\\sqrt{x})'=?", '\\frac{1}{2\\sqrt{x}}', ['\\frac{1}{\\sqrt{x}}', '-\\frac{1}{2\\sqrt{x}}', '2\\sqrt{x}'], 1, 'Căn bậc hai'),
      q('DG06', "\\left(\\frac{1}{x}\\right)'=?", '-\\frac{1}{x^2}', ['\\frac{1}{x^2}', '-\\frac{1}{x}', '1'], 1, 'Nghịch đảo'),
      q('DG07', "(\\sin x)'=?", '\\cos x', ['-\\cos x', '\\sin x', '-\\sin x'], 1, 'Sin'),
      q('DG08', "(\\cos x)'=?", '-\\sin x', ['\\sin x', '-\\cos x', '\\cos x'], 1, 'Cos'),

      q('DG09', "(u\\,v)'=?", "u'v+uv'", ["u'v'", "u'v-uv'", "uv'"], 2, 'Quy tắc tích'),
      q('DG10', "\\left(\\frac{u}{v}\\right)'=?,\\quad v\\ne0", "\\frac{u'v-uv'}{v^2}", ["\\frac{u'v+uv'}{v^2}", "\\frac{u'v-uv'}{v}", "\\frac{u'}{v'}"], 2, 'Quy tắc thương'),
      q('DG11', "(u^\\alpha)'=?,\\quad \\alpha\\in\\mathbb{R}", "\\alpha u^{\\alpha-1}u'", ['\\alpha u^{\\alpha-1}', "u^{\\alpha-1}u'", "\\alpha u^\\alpha u'"], 2, 'Lũy thừa hàm hợp'),
      q('DG12', "(\\sqrt{u})'=?", "\\frac{u'}{2\\sqrt{u}}", ['\\frac{1}{2\\sqrt{u}}', "\\frac{2u'}{\\sqrt{u}}", "-\\frac{u'}{2\\sqrt{u}}"], 2, 'Căn hàm hợp'),
      q('DG13', "\\left(\\frac{1}{u}\\right)'=?", "-\\frac{u'}{u^2}", ["\\frac{u'}{u^2}", "-\\frac{1}{u^2}", "-\\frac{u'}{u}"], 2, 'Nghịch đảo hàm hợp'),
      q('DG14', "(\\sin u)'=?", "u'\\cos u", ['\\cos u', "-u'\\cos u", "u'\\sin u"], 2, 'Sin hàm hợp'),
      q('DG15', "(\\cos u)'=?", "-u'\\sin u", ['-\\sin u', "u'\\sin u", "-u'\\cos u"], 2, 'Cos hàm hợp'),
      q('DG16', "\\left(\\sqrt[n]{x}\\right)'=?,\\quad n\\in\\mathbb{N}^*,\\ n>1", '\\frac{1}{n\\sqrt[n]{x^{n-1}}}', ['\\frac{1}{\\sqrt[n]{x^{n-1}}}', '\\frac{n}{\\sqrt[n]{x^{n-1}}}', '\\frac{1}{n\\sqrt[n]{x^n}}'], 2, 'Căn bậc n'),

      q('DG17', "\\left(\\sqrt[n]{u}\\right)'=?,\\quad n\\in\\mathbb{N}^*,\\ n>1", "\\frac{u'}{n\\sqrt[n]{u^{n-1}}}", ['\\frac{1}{n\\sqrt[n]{u^{n-1}}}', "\\frac{nu'}{\\sqrt[n]{u^{n-1}}}", "\\frac{u'}{n\\sqrt[n]{u^n}}"], 3, 'Căn bậc n hàm hợp'),
      q('DG18', "\\left(\\frac{k}{u}\\right)'=?,\\quad k\\text{ là hằng số}", "-\\frac{k u'}{u^2}", ["\\frac{k u'}{u^2}", '-\\frac{k}{u^2}', "-\\frac{k u'}{u}"], 3, 'Thương với hằng số'),
    ],
  },

  derivative_basic: {
    id: 'derivative_basic',
    subject: 'Toán',
    title: 'Đạo hàm cơ bản',
    instruction: 'Đạo hàm của hàm số sau là:',
    description: 'Lũy thừa, căn thức, phân thức và đa thức cơ bản.',
    questions: [
      q('DB01', 'y=x^2', '2x', ['x', '2x^2', 'x^2'], 1, 'Lũy thừa'),
      q('DB02', 'y=x^3', '3x^2', ['x^2', '3x', '\\frac{x^4}{4}'], 1, 'Lũy thừa'),
      q('DB03', 'y=x^4', '4x^3', ['4x^4', 'x^3', '3x^4'], 1, 'Lũy thừa'),
      q('DB04', 'y=5x^4', '20x^3', ['5x^3', '20x^4', '9x^3'], 1, 'Lũy thừa'),
      q('DB05', 'y=7x', '7', ['7x', 'x', '0'], 1, 'Hàm bậc nhất'),
      q('DB06', 'y=12', '0', ['12', '1', '12x'], 1, 'Hằng số'),
      q('DB07', 'y=\\sqrt{x}', '\\frac{1}{2\\sqrt{x}}', ['\\frac{1}{\\sqrt{x}}', '-\\frac{1}{2\\sqrt{x}}', '2\\sqrt{x}'], 1, 'Căn thức'),
      q('DB08', 'y=\\frac{1}{x}', '-\\frac{1}{x^2}', ['\\frac{1}{x^2}', '-\\frac{1}{x}', '1'], 1, 'Phân thức'),
      q('DB09', 'y=x^2-3x+2', '2x-3', ['2x+3', 'x-3', '2x-2'], 1, 'Đa thức'),
      q('DB10', 'y=3x^2+5x-1', '6x+5', ['3x+5', '6x-1', '6x+4'], 1, 'Đa thức'),
      q('DB11', 'y=2x^3-x^2+4', '6x^2-2x', ['6x^2-x', '6x-2x', '2x^2-2x'], 2, 'Đa thức'),
      q('DB12', 'y=4x^5-3x^2+x', '20x^4-6x+1', ['20x^4-3x+1', '20x^5-6x+1', '16x^4-6x+1'], 2, 'Đa thức'),
      q('DB13', 'y=\\frac{3}{x}', '-\\frac{3}{x^2}', ['\\frac{3}{x^2}', '-\\frac{1}{3x^2}', '-\\frac{3}{x}'], 2, 'Phân thức'),
      q('DB14', 'y=2\\sqrt{x}', '\\frac{1}{\\sqrt{x}}', ['\\frac{1}{2\\sqrt{x}}', '\\frac{2}{\\sqrt{x}}', '2\\sqrt{x}'], 2, 'Căn thức'),
      q('DB15', 'y=x^5+\\frac{1}{x}', '5x^4-\\frac{1}{x^2}', ['5x^4+\\frac{1}{x^2}', '4x^5-\\frac{1}{x^2}', '5x^4-\\frac{1}{x}'], 2, 'Tổng hợp'),
      q('DB16', 'y=\\sqrt{x}+x^3', '\\frac{1}{2\\sqrt{x}}+3x^2', ['\\frac{1}{\\sqrt{x}}+3x^2', '\\frac{1}{2\\sqrt{x}}+x^2', '-\\frac{1}{2\\sqrt{x}}+3x^2'], 2, 'Tổng hợp'),
      q('DB17', 'y=2x^6-5x^3+4x', '12x^5-15x^2+4', ['12x^5-15x^3+4', '12x^6-15x^2+4', '8x^5-15x^2+4'], 3, 'Đa thức'),
      q('DB18', 'y=x^7-\\frac{2}{x}', '7x^6+\\frac{2}{x^2}', ['7x^6-\\frac{2}{x^2}', '6x^7+\\frac{2}{x^2}', '7x^6+\\frac{2}{x}'], 3, 'Tổng hợp'),
    ],
  },

  derivative_trig: {
    id: 'derivative_trig',
    subject: 'Toán',
    title: 'Đạo hàm lượng giác',
    instruction: 'Đạo hàm của hàm số sau là:',
    description: 'sin, cos, tan, cot và các biểu thức lượng giác cơ bản.',
    questions: [
      q('DT01', 'y=\\sin x', '\\cos x', ['-\\cos x', '\\sin x', '-\\sin x'], 1, 'Sin'),
      q('DT02', 'y=\\cos x', '-\\sin x', ['\\sin x', '-\\cos x', '\\cos x'], 1, 'Cos'),
      q('DT03', 'y=\\tan x', '\\frac{1}{\\cos^2x}', ['-\\frac{1}{\\cos^2x}', '\\frac{1}{\\sin^2x}', '\\cot x'], 1, 'Tan'),
      q('DT04', 'y=\\cot x', '-\\frac{1}{\\sin^2x}', ['\\frac{1}{\\sin^2x}', '-\\frac{1}{\\cos^2x}', '-\\tan x'], 1, 'Cot'),
      q('DT05', 'y=3\\sin x', '3\\cos x', ['-3\\cos x', '3\\sin x', '\\cos x'], 1, 'Sin'),
      q('DT06', 'y=5\\cos x', '-5\\sin x', ['5\\sin x', '-5\\cos x', '-\\sin x'], 1, 'Cos'),
      q('DT07', 'y=x+\\sin x', '1+\\cos x', ['1-\\cos x', 'x+\\cos x', '1+\\sin x'], 2, 'Tổng hợp'),
      q('DT08', 'y=x^2+\\cos x', '2x-\\sin x', ['2x+\\sin x', 'x-\\sin x', '2x-\\cos x'], 2, 'Tổng hợp'),
      q('DT09', 'y=2\\tan x', '\\frac{2}{\\cos^2x}', ['-\\frac{2}{\\cos^2x}', '\\frac{2}{\\sin^2x}', '2\\cot x'], 2, 'Tan'),
      q('DT10', 'y=4\\cot x', '-\\frac{4}{\\sin^2x}', ['\\frac{4}{\\sin^2x}', '-\\frac{4}{\\cos^2x}', '-4\\tan x'], 2, 'Cot'),
      q('DT11', 'y=x^3-2\\sin x', '3x^2-2\\cos x', ['3x^2+2\\cos x', '3x-2\\cos x', '3x^2-2\\sin x'], 2, 'Tổng hợp'),
      q('DT12', 'y=2x^2+3\\cos x', '4x-3\\sin x', ['4x+3\\sin x', '4x-3\\cos x', '2x-3\\sin x'], 2, 'Tổng hợp'),
      q('DT13', 'y=x^4+\\tan x', '4x^3+\\frac{1}{\\cos^2x}', ['4x^3-\\frac{1}{\\cos^2x}', '4x^4+\\frac{1}{\\cos^2x}', '4x^3+\\frac{1}{\\sin^2x}'], 3, 'Tổng hợp'),
      q('DT14', 'y=3x^2-\\cot x', '6x+\\frac{1}{\\sin^2x}', ['6x-\\frac{1}{\\sin^2x}', '6x+\\frac{1}{\\cos^2x}', '3x+\\frac{1}{\\sin^2x}'], 3, 'Tổng hợp'),
    ],
  },


  derivative_chain: {
    id: 'derivative_chain',
    subject: 'Toán',
    title: 'Đạo hàm hàm hợp',
    instruction: 'Đạo hàm của hàm số sau là:',
    description: 'Quy tắc dây chuyền với lũy thừa, căn, phân thức và lượng giác.',
    questions: [
      q('DC01', 'y=(2x+1)^3', '6(2x+1)^2', ['3(2x+1)^2', '6(2x+1)^3', '2(2x+1)^2'], 1, 'Lũy thừa hàm hợp'),
      q('DC02', 'y=(3x-2)^4', '12(3x-2)^3', ['4(3x-2)^3', '12(3x-2)^4', '9(3x-2)^3'], 1, 'Lũy thừa hàm hợp'),
      q('DC03', 'y=\\sqrt{2x+1}', '\\frac{1}{\\sqrt{2x+1}}', ['\\frac{1}{2\\sqrt{2x+1}}', '\\frac{2}{\\sqrt{2x+1}}', '\\sqrt{2x+1}'], 1, 'Căn hàm hợp'),
      q('DC04', 'y=\\frac{1}{3x+1}', '-\\frac{3}{(3x+1)^2}', ['-\\frac{1}{(3x+1)^2}', '\\frac{3}{(3x+1)^2}', '-\\frac{3}{3x+1}'], 1, 'Phân thức hàm hợp'),
      q('DC05', 'y=\\sin(2x)', '2\\cos(2x)', ['\\cos(2x)', '-2\\cos(2x)', '2\\sin(2x)'], 1, 'Sin hàm hợp'),
      q('DC06', 'y=\\cos(3x)', '-3\\sin(3x)', ['3\\sin(3x)', '-\\sin(3x)', '-3\\cos(3x)'], 1, 'Cos hàm hợp'),
      q('DC07', 'y=\\tan(2x)', '\\frac{2}{\\cos^2(2x)}', ['\\frac{1}{\\cos^2(2x)}', '-\\frac{2}{\\cos^2(2x)}', '\\frac{2}{\\sin^2(2x)}'], 1, 'Tan hàm hợp'),
      q('DC08', 'y=\\cot(4x)', '-\\frac{4}{\\sin^2(4x)}', ['-\\frac{1}{\\sin^2(4x)}', '\\frac{4}{\\sin^2(4x)}', '-\\frac{4}{\\cos^2(4x)}'], 1, 'Cot hàm hợp'),

      q('DC09', 'y=(x^2+1)^3', '6x(x^2+1)^2', ['3(x^2+1)^2', '6x(x^2+1)^3', '3x(x^2+1)^2'], 2, 'Lũy thừa hàm hợp'),
      q('DC10', 'y=(2x^2-1)^4', '16x(2x^2-1)^3', ['8x(2x^2-1)^3', '16x(2x^2-1)^4', '4(2x^2-1)^3'], 2, 'Lũy thừa hàm hợp'),
      q('DC11', 'y=\\sqrt{x^2+1}', '\\frac{x}{\\sqrt{x^2+1}}', ['\\frac{1}{2\\sqrt{x^2+1}}', '\\frac{2x}{\\sqrt{x^2+1}}', '\\frac{x}{2\\sqrt{x^2+1}}'], 2, 'Căn hàm hợp'),
      q('DC12', 'y=\\frac{1}{x^2+1}', '-\\frac{2x}{(x^2+1)^2}', ['-\\frac{1}{(x^2+1)^2}', '\\frac{2x}{(x^2+1)^2}', '-\\frac{2x}{x^2+1}'], 2, 'Phân thức hàm hợp'),
      q('DC13', 'y=\\sin(x^2)', '2x\\cos(x^2)', ['\\cos(x^2)', '-2x\\cos(x^2)', '2x\\sin(x^2)'], 2, 'Sin hàm hợp'),
      q('DC14', 'y=\\cos(x^2+1)', '-2x\\sin(x^2+1)', ['2x\\sin(x^2+1)', '-\\sin(x^2+1)', '-2x\\cos(x^2+1)'], 2, 'Cos hàm hợp'),
      q('DC15', 'y=\\tan(x^2)', '\\frac{2x}{\\cos^2(x^2)}', ['\\frac{1}{\\cos^2(x^2)}', '-\\frac{2x}{\\cos^2(x^2)}', '\\frac{2x}{\\sin^2(x^2)}'], 2, 'Tan hàm hợp'),
      q('DC16', 'y=\\cot(3x^2)', '-\\frac{6x}{\\sin^2(3x^2)}', ['-\\frac{3}{\\sin^2(3x^2)}', '\\frac{6x}{\\sin^2(3x^2)}', '-\\frac{6x}{\\cos^2(3x^2)}'], 2, 'Cot hàm hợp'),

      q('DC17', 'y=(x^3-2x)^5', '5(3x^2-2)(x^3-2x)^4', ['5(x^3-2x)^4', '(3x^2-2)(x^3-2x)^4', '5(3x^2-2)(x^3-2x)^5'], 3, 'Lũy thừa hàm hợp'),
      q('DC18', 'y=\\sqrt{3x^2+1}', '\\frac{3x}{\\sqrt{3x^2+1}}', ['\\frac{6x}{\\sqrt{3x^2+1}}', '\\frac{3}{2\\sqrt{3x^2+1}}', '\\frac{3x}{2\\sqrt{3x^2+1}}'], 3, 'Căn hàm hợp'),
      q('DC19', 'y=\\frac{1}{x^3+1}', '-\\frac{3x^2}{(x^3+1)^2}', ['-\\frac{1}{(x^3+1)^2}', '\\frac{3x^2}{(x^3+1)^2}', '-\\frac{3x^2}{x^3+1}'], 3, 'Phân thức hàm hợp'),
      q('DC20', 'y=\\sin(2x^2+1)', '4x\\cos(2x^2+1)', ['2x\\cos(2x^2+1)', '4x\\sin(2x^2+1)', '-4x\\cos(2x^2+1)'], 3, 'Sin hàm hợp'),
      q('DC21', 'y=\\cos(x^3)', '-3x^2\\sin(x^3)', ['3x^2\\sin(x^3)', '-3x\\sin(x^3)', '-3x^2\\cos(x^3)'], 3, 'Cos hàm hợp'),
      q('DC22', 'y=\\tan(1-2x)', '-\\frac{2}{\\cos^2(1-2x)}', ['\\frac{2}{\\cos^2(1-2x)}', '-\\frac{1}{\\cos^2(1-2x)}', '-\\frac{2}{\\sin^2(1-2x)}'], 3, 'Tan hàm hợp'),
      q('DC23', 'y=\\sin^2x', '2\\sin x\\cos x', ['2\\sin x', '\\cos^2x', '-2\\sin x\\cos x'], 3, 'Lũy thừa lượng giác'),
      q('DC24', 'y=\\cos^3x', '-3\\cos^2x\\sin x', ['3\\cos^2x\\sin x', '-3\\cos x\\sin x', '-3\\cos^3x\\sin x'], 3, 'Lũy thừa lượng giác'),
    ],
  },

  derivative_exp_log: {
    id: 'derivative_exp_log',
    subject: 'Toán',
    title: 'Đạo hàm mũ – logarit',
    instruction: 'Đạo hàm của hàm số sau là:',
    description: 'Đạo hàm của e^x, a^x, ln x, log_a x và các hàm hợp thường gặp.',
    questions: [
      q('DL01', 'y=e^x', 'e^x', ['xe^{x-1}', '1', 'xe^x'], 1, 'Hàm mũ e'),
      q('DL02', 'y=2^x', '2^x\\ln 2', ['2^x', 'x2^{x-1}', '2^{x-1}'], 1, 'Hàm mũ cơ số a'),
      q('DL03', 'y=5^x', '5^x\\ln 5', ['5^x', '5x^{4}', 'x5^{x-1}'], 1, 'Hàm mũ cơ số a'),
      q('DL04', 'y=\\ln x', '\\frac{1}{x}', ['\\ln x', 'x', '-\\frac{1}{x}'], 1, 'Logarit tự nhiên'),
      q('DL05', 'y=\\log_2x', '\\frac{1}{x\\ln 2}', ['\\frac{1}{x}', '\\frac{\\ln 2}{x}', '\\frac{1}{2x}'], 1, 'Logarit cơ số a'),
      q('DL06', 'y=\\log_3x', '\\frac{1}{x\\ln 3}', ['\\frac{1}{x}', '\\frac{\\ln 3}{x}', '\\frac{1}{3x}'], 1, 'Logarit cơ số a'),
      q('DL07', 'y=e^{-x}', '-e^{-x}', ['e^{-x}', '-xe^{-x}', 'e^x'], 1, 'Hàm mũ e'),
      q('DL08', 'y=10^x', '10^x\\ln 10', ['10^x', '10x^9', 'x10^{x-1}'], 1, 'Hàm mũ cơ số a'),

      q('DL09', 'y=e^{2x}', '2e^{2x}', ['e^{2x}', '2xe^{2x}', 'e^{x}'], 2, 'Hàm mũ hợp'),
      q('DL10', 'y=e^{3x-1}', '3e^{3x-1}', ['e^{3x-1}', '(3x-1)e^{3x-1}', '3e^{3x}'], 2, 'Hàm mũ hợp'),
      q('DL11', 'y=2^{3x}', '3\\cdot2^{3x}\\ln 2', ['2^{3x}\\ln 2', '3\\cdot2^{3x}', '3x2^{3x-1}'], 2, 'Hàm mũ hợp'),
      q('DL12', 'y=5^{2x+1}', '2\\cdot5^{2x+1}\\ln 5', ['5^{2x+1}\\ln 5', '2\\cdot5^{2x+1}', '(2x+1)5^{2x}'], 2, 'Hàm mũ hợp'),
      q('DL13', 'y=\\ln(2x+1)', '\\frac{2}{2x+1}', ['\\frac{1}{2x+1}', '\\frac{2}{x}', '\\ln(2x+1)'], 2, 'Logarit hợp'),
      q('DL14', 'y=\\ln(x^2+1)', '\\frac{2x}{x^2+1}', ['\\frac{1}{x^2+1}', '\\frac{x}{x^2+1}', '\\frac{2x}{(x^2+1)^2}'], 2, 'Logarit hợp'),
      q('DL15', 'y=\\log_2(3x+1)', '\\frac{3}{(3x+1)\\ln 2}', ['\\frac{1}{(3x+1)\\ln 2}', '\\frac{3}{3x+1}', '\\frac{3\\ln 2}{3x+1}'], 2, 'Logarit hợp'),
      q('DL16', 'y=\\log_5(x^2+1)', '\\frac{2x}{(x^2+1)\\ln 5}', ['\\frac{1}{(x^2+1)\\ln 5}', '\\frac{2x}{x^2+1}', '\\frac{2x\\ln 5}{x^2+1}'], 2, 'Logarit hợp'),

      q('DL17', 'y=e^{x^2}', '2xe^{x^2}', ['e^{x^2}', '2e^{x^2}', 'x^2e^{x^2}'], 3, 'Hàm mũ hợp'),
      q('DL18', 'y=2^{x^2+1}', '2x\\cdot2^{x^2+1}\\ln 2', ['2^{x^2+1}\\ln 2', '2x\\cdot2^{x^2+1}', '(x^2+1)2^{x^2}'], 3, 'Hàm mũ hợp'),
      q('DL19', 'y=\\ln(\\sin x)', '\\frac{\\cos x}{\\sin x}', ['\\frac{1}{\\sin x}', '-\\frac{\\sin x}{\\cos x}', '\\cos x'], 3, 'Logarit hợp'),
      q('DL20', 'y=\\log_3(\\sin x)', '\\frac{\\cos x}{\\sin x\\ln 3}', ['\\frac{1}{\\sin x\\ln 3}', '\\frac{\\cos x}{\\sin x}', '-\\frac{\\sin x}{\\cos x\\ln 3}'], 3, 'Logarit hợp'),
      q('DL21', 'y=e^{\\sin x}', '\\cos x\\,e^{\\sin x}', ['e^{\\sin x}', '\\sin x\\,e^{\\sin x}', '-\\sin x\\,e^{\\sin x}'], 3, 'Hàm mũ hợp'),
      q('DL22', 'y=\\ln(x^3-1)', '\\frac{3x^2}{x^3-1}', ['\\frac{1}{x^3-1}', '\\frac{3x}{x^3-1}', '\\frac{3x^2}{(x^3-1)^2}'], 3, 'Logarit hợp'),
      q('DL23', 'y=xe^x', 'e^x(x+1)', ['xe^x', 'e^x', 'e^x(x-1)'], 3, 'Tích với hàm mũ'),
      q('DL24', 'y=x\\ln x', '\\ln x+1', ['\\ln x', '\\frac{1}{x}+1', 'x\\ln x+1'], 3, 'Tích với logarit'),
    ],
  },

  integral_basic: {
    id: 'integral_basic',
    subject: 'Toán',
    title: 'Nguyên hàm cơ bản',
    instruction: 'Một nguyên hàm của hàm số sau là:',
    description: 'Nguyên hàm lũy thừa, phân thức, mũ, lượng giác và tổng các hàm cơ bản.',
    questions: [
      q('IB01', 'f(x)=1', 'x', ['1', '0', 'x^2'], 1, 'Hằng số'),
      q('IB02', 'f(x)=x', '\\frac{x^2}{2}', ['x^2', '2x', '\\frac{x}{2}'], 1, 'Lũy thừa'),
      q('IB03', 'f(x)=x^2', '\\frac{x^3}{3}', ['2x', '\\frac{x^2}{2}', '3x^2'], 1, 'Lũy thừa'),
      q('IB04', 'f(x)=x^3', '\\frac{x^4}{4}', ['3x^2', '\\frac{x^3}{3}', '4x^3'], 1, 'Lũy thừa'),
      q('IB05', 'f(x)=\\frac{1}{x}', '\\ln|x|', ['-\\frac{1}{x^2}', '\\frac{1}{x^2}', '\\ln x^2'], 1, 'Logarit'),
      q('IB06', 'f(x)=e^x', 'e^x', ['xe^x', 'e^{x+1}', '1'], 1, 'Hàm mũ'),
      q('IB07', 'f(x)=\\cos x', '\\sin x', ['-\\sin x', '\\cos x', '-\\cos x'], 1, 'Lượng giác'),
      q('IB08', 'f(x)=\\sin x', '-\\cos x', ['\\cos x', '-\\sin x', '\\sin x'], 1, 'Lượng giác'),
      q('IB09', 'f(x)=\\frac{1}{\\cos^2x}', '\\tan x', ['-\\tan x', '\\cot x', '-\\cot x'], 1, 'Lượng giác'),
      q('IB10', 'f(x)=\\frac{1}{\\sin^2x}', '-\\cot x', ['\\cot x', '\\tan x', '-\\tan x'], 1, 'Lượng giác'),

      q('IB11', 'f(x)=3x^2', 'x^3', ['3x^3', '6x', '\\frac{x^3}{3}'], 2, 'Đa thức'),
      q('IB12', 'f(x)=2x+3', 'x^2+3x', ['2x^2+3x', 'x^2+3', '2+3x'], 2, 'Đa thức'),
      q('IB13', 'f(x)=4x^3-2x', 'x^4-x^2', ['4x^4-x^2', 'x^4-2x^2', '12x^2-2'], 2, 'Đa thức'),
      q('IB14', 'f(x)=2^x', '\\frac{2^x}{\\ln 2}', ['2^x\\ln 2', '\\frac{2^{x+1}}{x+1}', 'x2^{x-1}'], 2, 'Hàm mũ'),
      q('IB15', 'f(x)=a^x,\\quad a>0,\\ a\\ne1', '\\frac{a^x}{\\ln a}', ['a^x\\ln a', '\\frac{a^{x+1}}{x+1}', 'xa^{x-1}'], 2, 'Hàm mũ'),
      q('IB16', 'f(x)=5\\cos x-2\\sin x', '5\\sin x+2\\cos x', ['5\\sin x-2\\cos x', '-5\\sin x+2\\cos x', '5\\cos x+2\\sin x'], 2, 'Lượng giác'),

      q('IB17', 'f(x)=x^2+\\frac{1}{x}', '\\frac{x^3}{3}+\\ln|x|', ['\\frac{x^3}{3}-\\frac{1}{x^2}', 'x^3+\\ln|x|', '\\frac{x^3}{3}+\\frac{1}{x^2}'], 3, 'Tổng hợp'),
      q('IB18', 'f(x)=e^x+\\cos x', 'e^x+\\sin x', ['e^x-\\sin x', 'e^x+\\cos x', 'xe^x+\\sin x'], 3, 'Tổng hợp'),
      q('IB19', 'f(x)=3\\sin x-2\\cos x', '-3\\cos x-2\\sin x', ['3\\cos x-2\\sin x', '-3\\cos x+2\\sin x', '3\\sin x+2\\cos x'], 3, 'Tổng hợp'),
      q('IB20', 'f(x)=5x^4-\\frac{3}{x}', 'x^5-3\\ln|x|', ['25x^3+\\frac{3}{x^2}', 'x^5+3\\ln|x|', 'x^5-\\frac{3}{x^2}'], 3, 'Tổng hợp'),
    ],
  },

  integral_linear: {
    id: 'integral_linear',
    subject: 'Toán',
    title: 'Nguyên hàm f(ax+b)',
    instruction: 'Một nguyên hàm của hàm số sau là:',
    description: 'Nguyên hàm các hàm dạng f(ax+b), nhấn mạnh hệ số 1/a khi đổi biến tuyến tính.',
    questions: [
      q('IL01', 'f(ax+b),\\quad F\\prime(x)=f(x),\\ a\\ne0', '\\frac{1}{a}F(ax+b)', ['aF(ax+b)', 'F(ax+b)', '\\frac{1}{b}F(ax+b)'], 1, 'Công thức tổng quát'),
      q('IL02', 'f(x)=(2x+1)^3', '\\frac{(2x+1)^4}{8}', ['\\frac{(2x+1)^4}{4}', '2(2x+1)^4', '\\frac{(2x+1)^3}{6}'], 1, 'Lũy thừa tuyến tính'),
      q('IL03', 'f(x)=(3x-2)^2', '\\frac{(3x-2)^3}{9}', ['\\frac{(3x-2)^3}{3}', '3(3x-2)^3', '\\frac{(3x-2)^2}{6}'], 1, 'Lũy thừa tuyến tính'),
      q('IL04', 'f(x)=e^{2x+1}', '\\frac{1}{2}e^{2x+1}', ['2e^{2x+1}', 'e^{2x+1}', '\\frac{e^{2x+1}}{2x+1}'], 1, 'Hàm mũ tuyến tính'),
      q('IL05', 'f(x)=\\cos(2x)', '\\frac{1}{2}\\sin(2x)', ['2\\sin(2x)', '\\sin(2x)', '-\\frac{1}{2}\\sin(2x)'], 1, 'Cos tuyến tính'),
      q('IL06', 'f(x)=\\sin(3x)', '-\\frac{1}{3}\\cos(3x)', ['\\frac{1}{3}\\cos(3x)', '-3\\cos(3x)', '-\\cos(3x)'], 1, 'Sin tuyến tính'),
      q('IL07', 'f(x)=\\frac{1}{3x+1}', '\\frac{1}{3}\\ln|3x+1|', ['3\\ln|3x+1|', '\\ln|3x+1|', '-\\frac{1}{3(3x+1)^2}'], 1, 'Logarit tuyến tính'),
      q('IL08', 'f(x)=\\frac{1}{\\cos^2(4x-1)}', '\\frac{1}{4}\\tan(4x-1)', ['4\\tan(4x-1)', '\\tan(4x-1)', '-\\frac{1}{4}\\tan(4x-1)'], 1, 'Tan tuyến tính'),

      q('IL09', 'f(x)=\\sqrt{2x+1}', '\\frac{(2x+1)^{3/2}}{3}', ['\\frac{2(2x+1)^{3/2}}{3}', '\\frac{(2x+1)^{3/2}}{6}', '\\sqrt{2x+1}'], 2, 'Căn tuyến tính'),
      q('IL10', 'f(x)=(5x-1)^4', '\\frac{(5x-1)^5}{25}', ['\\frac{(5x-1)^5}{5}', '5(5x-1)^5', '\\frac{(5x-1)^4}{20}'], 2, 'Lũy thừa tuyến tính'),
      q('IL11', 'f(x)=(1-2x)^3', '-\\frac{(1-2x)^4}{8}', ['\\frac{(1-2x)^4}{8}', '-\\frac{(1-2x)^4}{4}', '2(1-2x)^4'], 2, 'Lũy thừa tuyến tính'),
      q('IL12', 'f(x)=2^{3x}', '\\frac{2^{3x}}{3\\ln 2}', ['\\frac{3\\cdot2^{3x}}{\\ln 2}', '3\\cdot2^{3x}\\ln2', '\\frac{2^{3x}}{\\ln 2}'], 2, 'Hàm mũ tuyến tính'),
      q('IL13', 'f(x)=5^{2x+1}', '\\frac{5^{2x+1}}{2\\ln 5}', ['\\frac{2\\cdot5^{2x+1}}{\\ln 5}', '2\\cdot5^{2x+1}\\ln5', '\\frac{5^{2x+1}}{\\ln 5}'], 2, 'Hàm mũ tuyến tính'),
      q('IL14', 'f(x)=\\frac{1}{\\sin^2(2x+3)}', '-\\frac{1}{2}\\cot(2x+3)', ['\\frac{1}{2}\\cot(2x+3)', '-2\\cot(2x+3)', '-\\cot(2x+3)'], 2, 'Cot tuyến tính'),
      q('IL15', 'f(x)=\\cos(5x-2)', '\\frac{1}{5}\\sin(5x-2)', ['5\\sin(5x-2)', '\\sin(5x-2)', '-\\frac{1}{5}\\sin(5x-2)'], 2, 'Cos tuyến tính'),
      q('IL16', 'f(x)=\\sin(1-4x)', '\\frac{1}{4}\\cos(1-4x)', ['-\\frac{1}{4}\\cos(1-4x)', '4\\cos(1-4x)', '-4\\cos(1-4x)'], 2, 'Sin tuyến tính'),

      q('IL17', 'f(x)=e^{1-3x}', '-\\frac{1}{3}e^{1-3x}', ['\\frac{1}{3}e^{1-3x}', '-3e^{1-3x}', 'e^{1-3x}'], 3, 'Hàm mũ tuyến tính'),
      q('IL18', 'f(x)=\\frac{1}{1-3x}', '-\\frac{1}{3}\\ln|1-3x|', ['\\frac{1}{3}\\ln|1-3x|', '-3\\ln|1-3x|', '\\ln|1-3x|'], 3, 'Logarit tuyến tính'),
      q('IL19', 'f(x)=\\sqrt{4x+1}', '\\frac{(4x+1)^{3/2}}{6}', ['\\frac{(4x+1)^{3/2}}{3}', '\\frac{(4x+1)^{3/2}}{12}', '2\\sqrt{4x+1}'], 3, 'Căn tuyến tính'),
      q('IL20', 'f(x)=\\frac{1}{(2x+3)^2}', '-\\frac{1}{2(2x+3)}', ['\\frac{1}{2(2x+3)}', '-\\frac{1}{(2x+3)}', '-\\frac{1}{2(2x+3)^2}'], 3, 'Phân thức tuyến tính'),
    ],
  },

  trig_formulas: {
    id: 'trig_formulas',
    subject: 'Toán',
    title: 'Công thức lượng giác',
    instruction: 'Chọn công thức đúng:',
    description: 'Nhận biết các công thức lượng giác thường dùng.',
    questions: [
      q('TF01', '\\sin^2x+\\cos^2x=?', '1', ['0', '2', '\\sin 2x'], 1, 'Cơ bản'),
      q('TF02', '1+\\tan^2x=?', '\\frac{1}{\\cos^2x}', ['\\frac{1}{\\sin^2x}', '1', '\\cos^2x'], 1, 'Cơ bản'),
      q('TF03', '1+\\cot^2x=?', '\\frac{1}{\\sin^2x}', ['\\frac{1}{\\cos^2x}', '1', '\\sin^2x'], 1, 'Cơ bản'),
      q('TF04', '\\sin 2x=?', '2\\sin x\\cos x', ['\\sin^2x-\\cos^2x', '2\\sin^2x', '\\sin x+\\cos x'], 1, 'Góc đôi'),
      q('TF05', '\\cos 2x=?', '\\cos^2x-\\sin^2x', ['2\\sin x\\cos x', '\\sin^2x-\\cos^2x', '\\cos^2x+\\sin^2x'], 1, 'Góc đôi'),
      q('TF06', '\\tan 2x=?', '\\frac{2\\tan x}{1-\\tan^2x}', ['\\frac{2\\tan x}{1+\\tan^2x}', '\\frac{1-\\tan^2x}{2\\tan x}', '2\\tan x'], 2, 'Góc đôi'),
      q('TF07', '\\sin(a+b)=?', '\\sin a\\cos b+\\cos a\\sin b', ['\\sin a\\cos b-\\cos a\\sin b', '\\cos a\\cos b-\\sin a\\sin b', '\\sin a+\\sin b'], 2, 'Cộng'),
      q('TF08', '\\cos(a+b)=?', '\\cos a\\cos b-\\sin a\\sin b', ['\\cos a\\cos b+\\sin a\\sin b', '\\sin a\\cos b+\\cos a\\sin b', '\\cos a+\\cos b'], 2, 'Cộng'),
      q('TF09', '\\sin(a-b)=?', '\\sin a\\cos b-\\cos a\\sin b', ['\\sin a\\cos b+\\cos a\\sin b', '\\cos a\\cos b-\\sin a\\sin b', '\\sin a-\\sin b'], 2, 'Hiệu'),
      q('TF10', '\\cos(a-b)=?', '\\cos a\\cos b+\\sin a\\sin b', ['\\cos a\\cos b-\\sin a\\sin b', '\\sin a\\cos b-\\cos a\\sin b', '\\cos a-\\cos b'], 2, 'Hiệu'),
    ],
  },

  exponent_log: {
    id: 'exponent_log',
    subject: 'Toán',
    title: 'Mũ và Logarit',
    instruction: 'Chọn công thức đúng:',
    description: 'Các công thức biến đổi lũy thừa và logarit cơ bản.',
    questions: [
      q('EL01', 'a^m\\cdot a^n=?', 'a^{m+n}', ['a^{mn}', 'a^{m-n}', '2a^{m+n}'], 1, 'Lũy thừa'),
      q('EL02', '\\frac{a^m}{a^n}=?', 'a^{m-n}', ['a^{m+n}', 'a^{n-m}', 'a^{mn}'], 1, 'Lũy thừa'),
      q('EL03', '(a^m)^n=?', 'a^{mn}', ['a^{m+n}', 'a^{m-n}', 'a^{m^n}'], 1, 'Lũy thừa'),
      q('EL04', 'a^{-n}=?', '\\frac{1}{a^n}', ['-a^n', '\\frac{-1}{a^n}', 'a^n'], 1, 'Lũy thừa'),
      q('EL05', '\\log_a(xy)=?', '\\log_a x+\\log_a y', ['\\log_a x-\\log_a y', '\\log_a(x+y)', '\\log_x a+\\log_y a'], 1, 'Logarit'),
      q('EL06', '\\log_a\\left(\\frac{x}{y}\\right)=?', '\\log_a x-\\log_a y', ['\\log_a x+\\log_a y', '\\frac{\\log_a x}{\\log_a y}', '\\log_a(x-y)'], 1, 'Logarit'),
      q('EL07', '\\log_a(x^n)=?', 'n\\log_a x', ['(\\log_a x)^n', '\\log_a x+n', '\\frac{1}{n}\\log_a x'], 2, 'Logarit'),
      q('EL08', '\\log_a b=?', '\\frac{\\ln b}{\\ln a}', ['\\frac{\\ln a}{\\ln b}', '\\ln a+\\ln b', '\\ln(a-b)'], 2, 'Đổi cơ số'),
    ],
  },
};

function q(id, prompt, answer, distractors, level, group, enabled = true) {
  return { id, prompt, answer, distractors, level, group, enabled };
}

export function listQuestionBanks() {
  return Object.values(QUESTION_BANKS);
}

export function getQuestionBank(id) {
  return QUESTION_BANKS[id] || QUESTION_BANKS.derivative_basic;
}


export function normalizeTopicIds(topicIds) {
  const input = Array.isArray(topicIds) ? topicIds : String(topicIds || '').split(',');
  const seen = new Set();
  return input
    .map((id) => String(id || '').trim())
    .filter((id) => QUESTION_BANKS[id] && !seen.has(id) && seen.add(id));
}

export function countAvailableQuestions(topicIds, difficulty = 'normal') {
  return normalizeTopicIds(topicIds).reduce((total, id) => {
    return total + filterQuestionsByDifficulty(QUESTION_BANKS[id].questions, difficulty).length;
  }, 0);
}

/**
 * Tạo một ngân hàng câu hỏi ảo từ nhiều chủ đề.
 * Câu được lấy vòng tròn giữa các chủ đề để số lượng tương đối cân bằng.
 * Với cùng seed + topicIds + difficulty + questionCount, mọi thiết bị tạo ra cùng tập câu.
 */
export function buildMultiTopicQuestionBank(topicIds, {
  difficulty = 'normal',
  questionCount = 0,
  seed = 'multi-topic',
} = {}) {
  const ids = normalizeTopicIds(topicIds);
  if (!ids.length) ids.push('derivative_basic');

  const pools = ids.map((id) => {
    const bank = QUESTION_BANKS[id];
    const questions = filterQuestionsByDifficulty(bank.questions, difficulty)
      .map((question) => ({ ...question, instruction: question.instruction || bank.instruction || 'Chọn đáp án đúng:', sourceBankId: bank.id, sourceTitle: bank.title }));
    return {
      id,
      title: bank.title,
      questions: seededShuffle(questions, `multi-pool:${seed}:${id}:${difficulty}`),
      index: 0,
    };
  }).filter((pool) => pool.questions.length);

  const available = pools.reduce((sum, pool) => sum + pool.questions.length, 0);
  const count = normalizeQuestionCount(questionCount, available);
  if (count < 3) throw new Error('Các chủ đề đã chọn cần có ít nhất 3 câu phù hợp.');

  // Xáo thứ tự ưu tiên chủ đề theo seed, nhưng vẫn lấy vòng tròn để cân bằng.
  const orderedPools = seededShuffle(pools, `multi-topic-order:${seed}:${ids.join('|')}`);
  const selected = [];
  while (selected.length < count) {
    let addedThisRound = false;
    for (const pool of orderedPools) {
      if (selected.length >= count) break;
      if (pool.index >= pool.questions.length) continue;
      selected.push(pool.questions[pool.index]);
      pool.index += 1;
      addedThisRound = true;
    }
    if (!addedThisRound) break;
  }

  const titles = ids.map((id) => QUESTION_BANKS[id].title);
  const title = titles.length === 1
    ? titles[0]
    : titles.length === 2
      ? titles.join(' + ')
      : `Ôn tập ${titles.length} chủ đề`;

  return {
    id: ids.length === 1 ? ids[0] : `multi_${ids.join('_')}`,
    subject: 'Toán',
    title,
    description: titles.join(' · '),
    topicIds: ids,
    sourceTitles: titles,
    questions: selected,
    availableCount: available,
  };
}

export function findQuestionById(questionId) {
  const id = String(questionId || '');
  for (const bank of Object.values(QUESTION_BANKS)) {
    const found = bank.questions.find((question) => question.id === id);
    if (found) return { ...found, instruction: found.instruction || bank.instruction || 'Chọn đáp án đúng:', sourceBankId: bank.id, sourceTitle: bank.title };
  }
  return null;
}
