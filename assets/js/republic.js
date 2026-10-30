/* Erata — 29 October / Republic Day section
   The HTML ships in English. This file swaps the text for the visitor's browser
   language (first match from navigator.languages) and falls back to English.
   Also hides the portrait cleanly if assets/img/ataturk.jpg is not there yet. */

(function () {
  "use strict";

  const root = document.getElementById("republic");
  if (!root) return;

  /* title: [plain part, italic part]. Languages written without spaces
     (Japanese, Chinese) join the two parts directly. */
  const TEXT = {
    tr: {
      kicker: "29 Ekim Cumhuriyet Bayramı",
      title: ["29 Ekim", "neden önemli?"],
      p1: "29 Ekim 1923’te Ankara’daki Türkiye Büyük Millet Meclisi, Türkiye Cumhuriyeti’ni ilan etti ve Mustafa Kemal Atatürk’ü ilk Cumhurbaşkanı seçti. O günden beri 29 Ekim, bayraklarla, törenlerle ve havai fişeklerle kutlanan ulusal bir bayram olarak Cumhuriyet Bayramı diye anılıyor.",
      p2: "Altı yüzyılı aşan Osmanlı yönetimini sona erdirdi ve egemenliğin kayıtsız şartsız millete ait olduğu fikrine dayanan modern bir devlet kurdu. Ardından gelen Cumhuriyet; eğitimde, hukukta ve kadınların toplumdaki yerinde yeni haklar ve devrimler getirdi, bugün de ülkenin üzerinde durduğu zemin olmayı sürdürüyor.",
      t1: "Kurtuluş Savaşı",
      t2: "Saltanatın kaldırılması",
      t3: "Cumhuriyetin ilanı"
    },
    en: {
      kicker: "29 October / Republic Day",
      title: ["Why 29 October", "matters."],
      p1: "On 29 October 1923, the Grand National Assembly in Ankara proclaimed the Republic of Türkiye and elected Mustafa Kemal Atatürk as its first President. The day has been celebrated as Republic Day ever since, a national holiday of flags, ceremonies and fireworks.",
      p2: "It closed more than six centuries of Ottoman rule and opened a modern state built on a simple idea: sovereignty belongs to the people. The Republic that followed brought new rights and reforms in education, law and the role of women, and it is still the ground the country stands on.",
      t1: "War of Independence",
      t2: "The sultanate is abolished",
      t3: "The Republic is proclaimed"
    },
    de: {
      kicker: "29. Oktober / Tag der Republik",
      title: ["Warum der 29. Oktober", "wichtig ist."],
      p1: "Am 29. Oktober 1923 rief die Große Nationalversammlung in Ankara die Republik Türkei aus und wählte Mustafa Kemal Atatürk zu ihrem ersten Präsidenten. Seitdem wird der Tag als Tag der Republik gefeiert, ein Nationalfeiertag mit Flaggen, Zeremonien und Feuerwerk.",
      p2: "Er beendete mehr als sechs Jahrhunderte osmanischer Herrschaft und begründete einen modernen Staat auf einem einfachen Gedanken: Die Souveränität gehört dem Volk. Die Republik brachte neue Rechte und Reformen in Bildung, Recht und der Stellung der Frau und ist bis heute das Fundament des Landes.",
      t1: "Befreiungskrieg",
      t2: "Abschaffung des Sultanats",
      t3: "Ausrufung der Republik"
    },
    fr: {
      kicker: "29 octobre / Fête de la République",
      title: ["Pourquoi le 29 octobre", "compte."],
      p1: "Le 29 octobre 1923, la Grande Assemblée nationale réunie à Ankara proclamait la République de Turquie et élisait Mustafa Kemal Atatürk premier président. Depuis, cette date est célébrée comme la Fête de la République, un jour férié rythmé de drapeaux, de cérémonies et de feux d’artifice.",
      p2: "Elle a mis fin à plus de six siècles de pouvoir ottoman et fondé un État moderne sur une idée simple : la souveraineté appartient au peuple. La République a apporté de nouveaux droits et des réformes dans l’éducation, le droit et la place des femmes, et elle reste le socle du pays.",
      t1: "Guerre d’indépendance",
      t2: "Abolition du sultanat",
      t3: "Proclamation de la République"
    },
    es: {
      kicker: "29 de octubre / Día de la República",
      title: ["Por qué importa", "el 29 de octubre."],
      p1: "El 29 de octubre de 1923, la Gran Asamblea Nacional reunida en Ankara proclamó la República de Turquía y eligió a Mustafa Kemal Atatürk como su primer presidente. Desde entonces se celebra el Día de la República, una fiesta nacional de banderas, ceremonias y fuegos artificiales.",
      p2: "Puso fin a más de seis siglos de dominio otomano y fundó un Estado moderno sobre una idea sencilla: la soberanía pertenece al pueblo. La República trajo nuevos derechos y reformas en la educación, la ley y el papel de la mujer, y sigue siendo el cimiento del país.",
      t1: "Guerra de Independencia",
      t2: "Abolición del sultanato",
      t3: "Proclamación de la República"
    },
    it: {
      kicker: "29 ottobre / Giorno della Repubblica",
      title: ["Perché il 29 ottobre", "è importante."],
      p1: "Il 29 ottobre 1923 la Grande Assemblea Nazionale riunita ad Ankara proclamò la Repubblica di Turchia ed elesse Mustafa Kemal Atatürk primo presidente. Da allora la data si celebra come Giorno della Repubblica, festa nazionale fatta di bandiere, cerimonie e fuochi d’artificio.",
      p2: "Pose fine a oltre sei secoli di dominio ottomano e fondò uno Stato moderno su un’idea semplice: la sovranità appartiene al popolo. La Repubblica portò nuovi diritti e riforme nell’istruzione, nel diritto e nel ruolo delle donne, ed è ancora oggi il fondamento del Paese.",
      t1: "Guerra d’indipendenza",
      t2: "Abolizione del sultanato",
      t3: "Proclamazione della Repubblica"
    },
    pt: {
      kicker: "29 de outubro / Dia da República",
      title: ["Por que o 29 de outubro", "importa."],
      p1: "Em 29 de outubro de 1923, a Grande Assembleia Nacional, reunida em Ancara, proclamou a República da Turquia e elegeu Mustafa Kemal Atatürk como primeiro presidente. Desde então a data é celebrada como o Dia da República, um feriado nacional de bandeiras, cerimônias e fogos de artifício.",
      p2: "Encerrou mais de seis séculos de domínio otomano e fundou um Estado moderno sobre uma ideia simples: a soberania pertence ao povo. A República trouxe novos direitos e reformas na educação, no direito e no papel das mulheres, e continua sendo o alicerce do país.",
      t1: "Guerra de Independência",
      t2: "Abolição do sultanato",
      t3: "Proclamação da República"
    },
    nl: {
      kicker: "29 oktober / Dag van de Republiek",
      title: ["Waarom 29 oktober", "ertoe doet."],
      p1: "Op 29 oktober 1923 riep de Grote Nationale Vergadering in Ankara de Republiek Turkije uit en koos Mustafa Kemal Atatürk tot eerste president. Sindsdien wordt die dag gevierd als Dag van de Republiek, een nationale feestdag met vlaggen, ceremonies en vuurwerk.",
      p2: "Het maakte een einde aan meer dan zes eeuwen Ottomaanse heerschappij en legde de basis voor een moderne staat op een eenvoudig idee: de soevereiniteit ligt bij het volk. De Republiek bracht nieuwe rechten en hervormingen in onderwijs, recht en de positie van vrouwen, en vormt nog steeds het fundament van het land.",
      t1: "Onafhankelijkheidsoorlog",
      t2: "Afschaffing van het sultanaat",
      t3: "Uitroeping van de Republiek"
    },
    pl: {
      kicker: "29 października / Dzień Republiki",
      title: ["Dlaczego 29 października", "jest ważny."],
      p1: "29 października 1923 roku Wielkie Zgromadzenie Narodowe w Ankarze proklamowało Republikę Turcji i wybrało Mustafę Kemala Atatürka na pierwszego prezydenta. Od tamtej pory dzień ten obchodzi się jako Dzień Republiki, święto narodowe pełne flag, uroczystości i fajerwerków.",
      p2: "Zakończył ponad sześć wieków rządów osmańskich i dał początek nowoczesnemu państwu opartemu na prostej myśli: suwerenność należy do narodu. Republika przyniosła nowe prawa oraz reformy w edukacji, prawie i pozycji kobiet i do dziś pozostaje fundamentem kraju.",
      t1: "Wojna o niepodległość",
      t2: "Zniesienie sułtanatu",
      t3: "Proklamowanie Republiki"
    },
    ru: {
      kicker: "29 октября / День Республики",
      title: ["Почему важно", "29 октября."],
      p1: "29 октября 1923 года Великое национальное собрание Турции в Анкаре провозгласило Турецкую Республику и избрало Мустафу Кемаля Ататюрка её первым президентом. С тех пор эта дата отмечается как День Республики — национальный праздник с флагами, церемониями и фейерверками.",
      p2: "Она положила конец более чем шести векам османского правления и дала начало современному государству, построенному на простой идее: суверенитет принадлежит народу. Республика принесла новые права и реформы в образовании, праве и положении женщин и по сей день остаётся фундаментом страны.",
      t1: "Война за независимость",
      t2: "Отмена султаната",
      t3: "Провозглашение Республики"
    },
    uk: {
      kicker: "29 жовтня / День Республіки",
      title: ["Чому важливе", "29 жовтня."],
      p1: "29 жовтня 1923 року Великі національні збори Туреччини в Анкарі проголосили Турецьку Республіку й обрали Мустафу Кемаля Ататюрка її першим президентом. Відтоді цю дату відзначають як День Республіки — національне свято з прапорами, церемоніями та феєрверками.",
      p2: "Вона поклала край османському правлінню, що тривало понад шість століть, і започаткувала сучасну державу, засновану на простій ідеї: суверенітет належить народові. Республіка принесла нові права та реформи в освіті, праві й становищі жінок і досі залишається фундаментом країни.",
      t1: "Війна за незалежність",
      t2: "Скасування султанату",
      t3: "Проголошення Республіки"
    },
    ar: {
      kicker: "29 أكتوبر / عيد الجمهورية",
      title: ["لماذا يُعدّ 29 أكتوبر", "مهمًا؟"],
      p1: "في 29 أكتوبر 1923 أعلن المجلس الوطني الكبير في أنقرة قيام الجمهورية التركية وانتخب مصطفى كمال أتاتورك أول رئيس لها. ومنذ ذلك الحين يُحتفل بهذا اليوم بوصفه عيد الجمهورية، وهو عطلة وطنية تُرفع فيها الأعلام وتُقام الاحتفالات والألعاب النارية.",
      p2: "أنهى هذا اليوم أكثر من ستة قرون من الحكم العثماني، وأسّس دولة حديثة قامت على فكرة بسيطة: السيادة للشعب. وجلبت الجمهورية حقوقًا وإصلاحات جديدة في التعليم والقانون ومكانة المرأة، وما زالت الأساس الذي تقوم عليه البلاد.",
      t1: "حرب الاستقلال",
      t2: "إلغاء السلطنة",
      t3: "إعلان الجمهورية",
      rtl: true
    },
    az: {
      kicker: "29 Oktyabr / Cümhuriyyət Günü",
      title: ["29 Oktyabr", "niyə vacibdir?"],
      p1: "1923-cü il oktyabrın 29-da Ankarada Türkiyə Böyük Millət Məclisi Türkiyə Respublikasının yarandığını elan etdi və Mustafa Kamal Atatürkü ilk prezident seçdi. O vaxtdan bəri bu gün bayraqlar, mərasimlər və atəşfişanlıqla qeyd olunan milli bayram – Cümhuriyyət Günü kimi tanınır.",
      p2: "O, altı əsrdən çox davam edən Osmanlı hakimiyyətinə son qoydu və suverenliyin xalqa məxsus olduğu sadə ideyaya əsaslanan müasir dövlət qurdu. Respublika təhsildə, hüquqda və qadınların cəmiyyətdəki yerində yeni hüquqlar və islahatlar gətirdi və bu gün də ölkənin dayandığı təməl olaraq qalır.",
      t1: "İstiqlal Müharibəsi",
      t2: "Sultanlığın ləğvi",
      t3: "Respublikanın elan edilməsi"
    },
    ja: {
      kicker: "10月29日 / 共和国記念日",
      title: ["10月29日が", "大切な理由。"],
      noSpace: true,
      p1: "1923年10月29日、アンカラのトルコ大国民議会がトルコ共和国の成立を宣言し、ムスタファ・ケマル・アタテュルクを初代大統領に選出しました。以来この日は共和国記念日として祝われ、国旗や式典、花火で彩られる国民の祝日となっています。",
      p2: "この日は600年以上続いたオスマン帝国の支配に幕を下ろし、「主権は国民にある」という単純な理念に基づく近代国家を生み出しました。共和国は教育や法、女性の地位において新たな権利と改革をもたらし、今も国の土台であり続けています。",
      t1: "独立戦争",
      t2: "スルタン制の廃止",
      t3: "共和国の宣言"
    },
    zh: {
      kicker: "10月29日 / 共和国日",
      title: ["为什么10月29日", "很重要。"],
      noSpace: true,
      p1: "1923年10月29日，位于安卡拉的土耳其大国民议会宣布成立土耳其共和国，并选举穆斯塔法·凯末尔·阿塔图尔克为首任总统。从那以后，这一天作为共和国日被庆祝，是一个有旗帜、仪式和烟花的法定节日。",
      p2: "它结束了六个多世纪的奥斯曼统治，并以一个朴素的理念建立起现代国家：主权属于人民。共和国在教育、法律和妇女地位方面带来了新的权利与改革，至今仍是这个国家立足的根基。",
      t1: "独立战争",
      t2: "废除苏丹制",
      t3: "宣布共和国成立"
    },
    ko: {
      kicker: "10월 29일 / 공화국 기념일",
      title: ["10월 29일이", "중요한 이유."],
      p1: "1923년 10월 29일, 앙카라의 튀르키예 대국민의회는 튀르키예 공화국의 수립을 선포하고 무스타파 케말 아타튀르크를 초대 대통령으로 선출했습니다. 이후 이날은 깃발과 기념식, 불꽃놀이로 기념하는 국경일인 공화국 기념일로 이어져 왔습니다.",
      p2: "이날은 600년 넘게 이어진 오스만 제국의 통치를 끝내고, 주권은 국민에게 있다는 단순한 생각 위에 근대 국가를 세웠습니다. 공화국은 교육과 법, 여성의 지위에서 새로운 권리와 개혁을 가져왔으며 지금도 나라의 토대로 남아 있습니다.",
      t1: "독립 전쟁",
      t2: "술탄제 폐지",
      t3: "공화국 선포"
    }
  };

  const languages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || "en"];
  /* The 29.10 section stays in English for every visitor. Set this to true to
     bring back automatic translation by browser language (texts above are kept). */
  const AUTO_TRANSLATE = false;

  let code = "en";
  for (const tag of AUTO_TRANSLATE ? languages : []) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (TEXT[base]) {
      code = base;
      break;
    }
  }

  const copy = TEXT[code];
  const box = root.querySelector("[data-rp-box]");

  if (code !== "en") {
    root.querySelectorAll("[data-rp]").forEach((node) => {
      const key = node.getAttribute("data-rp");
      const value = copy[key];
      if (!value) return;
      if (key === "title") {
        node.textContent = copy.noSpace ? value[0] : `${value[0]} `;
        const accent = document.createElement("em");
        accent.textContent = value[1];
        node.appendChild(accent);
      } else {
        node.textContent = value;
      }
    });

    root.lang = code;
    if (copy.rtl) {
      root.dir = "rtl";
      root.classList.add("is-rtl");
    }
  }

  /* Portrait: if the file is missing, collapse the figure and let the text breathe. */
  const figure = root.querySelector(".republic-figure");
  const photo = figure ? figure.querySelector("img") : null;
  const grid = root.querySelector(".republic-grid");

  const hidePhoto = () => {
    figure.classList.add("is-missing");
    if (grid) grid.classList.add("no-photo");
  };

  if (photo) {
    photo.addEventListener("error", hidePhoto);
    if (photo.complete && photo.naturalWidth === 0) hidePhoto();
  }

  if (box) box.setAttribute("data-lang", code);
})();
