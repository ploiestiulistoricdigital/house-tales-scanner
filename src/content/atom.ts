import type { Lang } from "@/lib/i18n";

export type L10n = { ro: string; en: string; fr: string };

export function tr(lang: Lang, v: L10n): string {
  return v[lang] ?? v.ro;
}

export const ATOM_LINKS = {
  site: "https://atomploiesti.ro/",
  facebook: "https://web.facebook.com/atomploiesti",
  contactForm: "https://atomploiesti.ro/contact/",
  membership: "https://atomploiesti.ro/wp-content/uploads/2020/07/cerere-de-adeziune.pdf",
  form230: "https://static.anaf.ro/static/10/Anaf/Declaratii_R/230.html",
  declaratieUnica: "https://static.anaf.ro/static/10/Anaf/Declaratii_R/declaratie_unica.html",
  gallery: "https://atomploiesti.ro/galerie-foto/",
  shop: "https://atomploiesti.ro/magazin/",
  usefulLinks: "https://atomploiesti.ro/link-uri-utile/",
  emailSubscribe:
    "http://www.specificfeeds.com/widgets/emailSubscribeEncFeed/WmFMdXpBckx5SzRWekYzbWdQM21DclRNWHZWQTNka1RRalliQ1YwNlBDUGVvY1duckZtZEE0Qlh6VjlnRUIrMlh1SVlvaWowQVB5TEkwQTVtUG9CZUx3TG55WVJNZ1pKNEtJeTcxTEp6VWkxZEh5b09LckFWVmo5eEswb3huNC98MjQ0dmxWalA1c0ErVDYwenNjbGRPWVY4N0NuRlBydW1hdVhQWWRKczdUdz0=/OA==/",
};

export const MOTTO: L10n = {
  ro: "„Istoria este cea mai frumoasă poveste.”",
  en: "“History is the most beautiful story.”",
  fr: "« L'histoire est la plus belle des histoires. »",
};

export const ABOUT_INTRO: L10n[] = [
  {
    ro: "Societatea Culturală „ATOM” Ploieşti a fost înființată în anul 2018 cu scopul declarat de a fi o organizație care să sprijine și să contribuie prin activitatea sa la îmbunătățirea mediului cultural ploieștean, la crearea unui climat care să încurajeze spiritul participativ și implicarea citadinilor în viața urbei și, de asemenea, să fie un vector de cunoaștere a istoriei urbane a Ploieștiului.",
    en: "The “ATOM” Ploiești Cultural Society was founded in 2018 with the declared purpose of being an organisation that supports and contributes to improving the cultural life of Ploiești, to creating a climate that encourages civic participation and the involvement of citizens in the life of the city, and to acting as a vehicle for knowledge of the urban history of Ploiești.",
    fr: "La Société Culturelle « ATOM » Ploiești a été fondée en 2018 avec pour but déclaré d'être une organisation qui soutient et contribue à l'amélioration de la vie culturelle de Ploiești, à la création d'un climat encourageant la participation civique et l'implication des habitants dans la vie de la ville, et d'être un vecteur de connaissance de l'histoire urbaine de Ploiești.",
  },
  {
    ro: "Inițiativa acestui proiect îi aparține inginerului Alin Tomozei, un om pasionat de trecutul orașului și interesat de încurajarea studierii istoriei locale, de sprijinirea tinerilor intelectuali ai orașului, al tuturor acelora care au sau vor avea un cuvânt de spus pe tărâmul cultural ploieștean, dar și de oferirea accesului publicului larg la informația de natură culturală privind orașul Ploiești și istoria sa.",
    en: "The initiative belongs to the engineer Alin Tomozei, a man passionate about the city's past, committed to encouraging the study of local history, to supporting the city's young intellectuals and all those who have or will have a say in the cultural life of Ploiești, and to giving the wider public access to cultural information about the city and its history.",
    fr: "L'initiative appartient à l'ingénieur Alin Tomozei, passionné par le passé de la ville, soucieux d'encourager l'étude de l'histoire locale, de soutenir les jeunes intellectuels de la ville et tous ceux qui ont ou auront leur mot à dire dans la vie culturelle de Ploiești, et d'ouvrir au grand public l'accès à l'information culturelle sur la ville et son histoire.",
  },
];

export const ABOUT_OBJECTIVES_TITLE: L10n = {
  ro: "Principalele obiective pe termen lung",
  en: "Main long-term objectives",
  fr: "Principaux objectifs à long terme",
};

export const ABOUT_OBJECTIVES: L10n[] = [
  {
    ro: "Crearea unei baze de date și digitalizarea celor mai relevante și inedite fotografii ale Ploieștiului secolului al XX-lea (dintr-o colecție de peste 10.000 de fotografii și negative).",
    en: "Building a database and digitising the most relevant and previously unpublished photographs of 20th-century Ploiești (from a collection of over 10,000 photographs and negatives).",
    fr: "Constituer une base de données et numériser les photographies les plus significatives et inédites du Ploiești du XXe siècle (issues d'une collection de plus de 10 000 photographies et négatifs).",
  },
  {
    ro: "Identificarea unor noi surse de informații privind istoria orașului Ploiești.",
    en: "Identifying new sources of information on the history of the city of Ploiești.",
    fr: "Identifier de nouvelles sources d'information sur l'histoire de la ville de Ploiești.",
  },
  {
    ro: "Repunerea în circuitul memoriei colective a unor personalități marcante ale orașului.",
    en: "Bringing prominent figures of the city back into collective memory.",
    fr: "Réintroduire dans la mémoire collective des personnalités marquantes de la ville.",
  },
  {
    ro: "Publicarea la editura proprie a unor lucrări cu subiecte de istorie ploieșteană.",
    en: "Publishing works on Ploiești history through the society's own publishing house.",
    fr: "Publier, via sa propre maison d'édition, des ouvrages consacrés à l'histoire de Ploiești.",
  },
  {
    ro: "Încurajarea și sprijinirea cercetătorilor istoriei și culturii locale.",
    en: "Encouraging and supporting researchers of local history and culture.",
    fr: "Encourager et soutenir les chercheurs en histoire et culture locales.",
  },
  {
    ro: "Crearea unui loc de întâlnire și a unor evenimente culturale care să aducă în același cadru pasionații de istorie locală și istoricii, critici literari, scriitorii ploieșteni.",
    en: "Creating a meeting place and cultural events that bring together local history enthusiasts, historians, literary critics and writers from Ploiești.",
    fr: "Créer un lieu de rencontre et des événements culturels réunissant passionnés d'histoire locale, historiens, critiques littéraires et écrivains de Ploiești.",
  },
];

export const ABOUT_FOUNDERS: L10n = {
  ro: "Proiectul Societatea Culturală ATOM Ploiești s-a născut și din sprijinul și colaborarea nemijlocită a membrilor săi fondatori, vicepreședinți ai Asociației — istoricul prof. dr. Dorin Stănescu și Alec Tomozei, director adjunct al Consproiect S.A. — dar și al vechilor și mereu prezenților parteneri de trăiri ploieștene, precum profesorul și apreciatul scriitor Dan Gulea.",
  en: "The ATOM Ploiești Cultural Society also grew out of the direct support and collaboration of its founding members, vice-presidents of the association — the historian Prof. Dr. Dorin Stănescu and Alec Tomozei, deputy director of Consproiect S.A. — as well as long-standing partners in the life of the city, such as the teacher and acclaimed writer Dan Gulea.",
  fr: "La Société Culturelle ATOM Ploiești est également née du soutien et de la collaboration directe de ses membres fondateurs, vice-présidents de l'association — l'historien prof. dr. Dorin Stănescu et Alec Tomozei, directeur adjoint de Consproiect S.A. — ainsi que de partenaires de longue date de la vie ploieștienne, comme le professeur et écrivain reconnu Dan Gulea.",
};

export const JOIN_CTA: L10n = {
  ro: "Vrei să fii alături de noi? Poți fi noul membru al societății noastre. Doar împreună putem scrie istoria orașului nostru.",
  en: "Would you like to join us? You can become the newest member of our society. Only together can we write the history of our city.",
  fr: "Vous souhaitez nous rejoindre ? Vous pouvez devenir le nouveau membre de notre société. Ce n'est qu'ensemble que nous pourrons écrire l'histoire de notre ville.",
};

/* ---------------- Projects ---------------- */

export const FEATURED_PROJECT = {
  year: "2026",
  title:
    "Volumul „Patrimoniul istoric al Ploieștiului: case, oameni și destine”, autor Alin Tomozei",
  imageUrl: "https://atomploiesti.ro/wp-content/uploads/2026/05/Patrimoniu-1024x677.jpg",
  sourceUrl: "https://atomploiesti.ro/proiecte/",
  body: [
    {
      ro: "Volumul „Patrimoniul istoric al Ploieștiului: case, oameni și destine”, semnat de Alin Tomozei, reprezintă o lucrare monumentală dedicată orașului nostru și memoriei sale colective, deschisă de un cuvânt înainte semnat de prof. dr. Dorin Stănescu.",
      en: "“The historical heritage of Ploiești: houses, people and destinies”, written by Alin Tomozei, is a monumental work dedicated to our city and its collective memory, opening with a foreword by Prof. Dr. Dorin Stănescu.",
      fr: "« Le patrimoine historique de Ploiești : maisons, hommes et destins », signé par Alin Tomozei, est une œuvre monumentale dédiée à notre ville et à sa mémoire collective, ouverte par une préface du prof. dr. Dorin Stănescu.",
    },
    {
      ro: "Cu cele 760 de pagini ale sale, cartea reprezintă una dintre cele mai ample și mai bine documentate contribuții recente la cunoașterea istoriei locale. Ea adună laolaltă poveștile caselor vechi ale Ploieștiului, ale arhitecților care le-au imaginat, ale oamenilor care le-au ridicat, le-au locuit și le-au însuflețit, lăsând în ziduri urmă de viață și destin.",
      en: "With its 760 pages, the book is one of the broadest and best documented recent contributions to local history. It gathers the stories of the old houses of Ploiești, of the architects who imagined them and of the people who built, inhabited and brought them to life, leaving traces of life and destiny in their walls.",
      fr: "Avec ses 760 pages, le livre est l'une des contributions récentes les plus vastes et les mieux documentées à l'histoire locale. Il rassemble les histoires des vieilles maisons de Ploiești, des architectes qui les ont imaginées et des gens qui les ont bâties, habitées et animées, laissant dans les murs des traces de vie et de destin.",
    },
    {
      ro: "Clădirile — unele dispărute între timp — de pe Bulevardul Independenței, din centrul orașului și de pe fosta Cale a Câmpinii devin personaje ale propriei istorii: case boierești, reședințe de negustori, locuințe ale elitei urbane, dar și edificii publice emblematice, precum Primăria Veche, Tribunalul, Banca Națională, Halele Centrale, liceele istorice, bisericile și gările care au modelat sufletul orașului.",
      en: "The buildings — some now vanished — on Independenței Boulevard, in the city centre and along the former Câmpina Road become characters in their own history: boyar houses, merchants' residences, homes of the urban elite, but also emblematic public buildings such as the Old City Hall, the Courthouse, the National Bank, the Central Halls, the historic high schools, the churches and the railway stations that shaped the soul of the city.",
      fr: "Les bâtiments — certains aujourd'hui disparus — du boulevard Independenței, du centre-ville et de l'ancienne route de Câmpina deviennent les personnages de leur propre histoire : maisons boyardes, résidences de marchands, demeures de l'élite urbaine, mais aussi édifices publics emblématiques comme l'Ancienne Mairie, le Tribunal, la Banque Nationale, les Halles Centrales, les lycées historiques, les églises et les gares qui ont façonné l'âme de la ville.",
    },
    {
      ro: "Un capitol aparte este dedicat moștenirii multietnice a Ploieștiului, în special comunității evreiești, prin prezentarea unor clădiri-simbol precum Grand Hotel Luca Moise, Sala Modern, școlile comunității și sinagoga Beth Israel.",
      en: "A separate chapter is devoted to the multi-ethnic heritage of Ploiești, particularly the Jewish community, presenting landmark buildings such as the Grand Hotel Luca Moise, the Modern Hall, the community schools and the Beth Israel synagogue.",
      fr: "Un chapitre à part est consacré à l'héritage multiethnique de Ploiești, en particulier à la communauté juive, à travers des bâtiments emblématiques tels que le Grand Hôtel Luca Moise, la Salle Modern, les écoles de la communauté et la synagogue Beth Israel.",
    },
  ] as L10n[],
};

export type Volume = { title: string; author: string; year: string };

export const VOLUMES: Volume[] = [
  { title: "Patrimoniul istoric al Ploieștiului: case, oameni și destine", author: "Alin Tomozei", year: "2026" },
  { title: "Tărâmul memoriei", author: "Mihail Bogdan Dabija", year: "2025" },
  { title: "Cetățeni de Onoare ai Municipiului Ploiești", author: "Ioan Groșescu", year: "2025" },
  { title: "Operație pe cord deschis", author: "Ioan Groșescu", year: "2025" },
  { title: "Centrul Civic Ploiești în proiecte (1950–1990)", author: "Alec Tomozei", year: "2024" },
  { title: "50 ani de Haz de Necaz", author: "Ștefan Romanó", year: "2022" },
  { title: "Traversând Ploieștii, volumul III", author: "Alin Tomozei", year: "2022" },
  { title: "Traversând Ploieștii, volumul II", author: "Alin Tomozei", year: "2021" },
  { title: "Traversând Ploieștii, volumul I", author: "Alin Tomozei", year: "2021" },
  { title: "Statuia Libertății. O istorie republicană ilustrată", author: "prof. dr. Dorin Stănescu, prof. Dan Gulea", year: "2020" },
  { title: "1965. Crima care a zguduit Ploieștiul", author: "Alin Tomozei", year: "2018" },
  { title: "Orașul dispărut. Ploiești", author: "prof. Dan Gulea", year: "2017" },
];

/* ---------------- News ---------------- */

export type NewsItem = {
  date: string;
  url: string;
  title: L10n;
  excerpt: L10n;
};

export const NEWS: NewsItem[] = [
  {
    date: "2026-03-09",
    url: "https://atomploiesti.ro/primaria-ploiesti-anunta-elaborarea-regulamentului-de-estetica-urbana-si-mobilier-urban-pentru-zona-centrala-si-bd-independentei/",
    title: {
      ro: "Primăria Ploiești anunță elaborarea Regulamentului de Estetică urbană și mobilier urban pentru zona centrală și bulevardul Independenței",
      en: "Ploiești City Hall announces an urban aesthetics and street furniture regulation for the city centre and Independenței Boulevard",
      fr: "La mairie de Ploiești annonce l'élaboration d'un règlement d'esthétique urbaine et de mobilier urbain pour le centre-ville et le boulevard Independenței",
    },
    excerpt: {
      ro: "Societatea Culturală „ATOM” Ploiești a participat, vineri, 6 martie, în calitate de invitat al Primăriei Municipiului Ploiești, la prima întâlnire formală organizată cu reprezentanții sectorului HoReCa, în contextul interesului manifestat pentru deschiderea unui dialog institușional privind viitorul zonei centrale.",
      en: "On Friday, 6 March, the “ATOM” Ploiești Cultural Society took part, as a guest of Ploiești City Hall, in the first formal meeting with representatives of the hospitality sector, opening an institutional dialogue about the future of the city centre.",
      fr: "Le vendredi 6 mars, la Société Culturelle « ATOM » Ploiești a participé, invitée par la mairie de Ploiești, à la première réunion formelle avec les représentants du secteur de la restauration, ouvrant un dialogue institutionnel sur l'avenir du centre-ville.",
    },
  },
  {
    date: "2026-02-27",
    url: "https://atomploiesti.ro/revitalizarea-zonei-centrale-cu-ajutorul-ai/",
    title: {
      ro: "Revitalizarea zonei centrale cu ajutorul AI",
      en: "Revitalising the city centre with the help of AI",
      fr: "La revitalisation du centre-ville avec l'aide de l'IA",
    },
    excerpt: {
      ro: "Primăria Ploiești anunță un amplu proiect de revitalizare a zonei centrale, iar noi nu putem fi decât nerăbdători să trăim vremurile în care orașul va arăta cu adevărat ca o metropolă europeană.",
      en: "Ploiești City Hall has announced a large-scale project to revitalise the city centre, and we can only look forward to the day when the city truly looks like a European metropolis.",
      fr: "La mairie de Ploiești annonce un vaste projet de revitalisation du centre-ville, et nous attendons avec impatience le moment où la ville ressemblera véritablement à une métropole européenne.",
    },
  },
  {
    date: "2026-02-05",
    url: "https://atomploiesti.ro/strada-kogalniceanu-si-vechea-librarie-muntenia-cartea-rusa/",
    title: {
      ro: "Strada Kogălniceanu și vechea librărie „Muntenia” (Cartea rusă)",
      en: "Kogălniceanu Street and the old “Muntenia” bookshop (The Russian Book)",
      fr: "La rue Kogălniceanu et l'ancienne librairie « Muntenia » (Le Livre russe)",
    },
    excerpt: {
      ro: "Prin studiul de sistematizare elaborat după cutremurul din martie 1977 au fost demolate vechile clădiri cu spații comerciale la parter și locuințe la etaj, cea mai cunoscută fiind casa mareșalului Prezan, la parterul căreia a funcționat librăria „Muntenia”.",
      en: "The urban planning study drawn up after the March 1977 earthquake led to the demolition of the old buildings with shops on the ground floor and homes above — the best known being Marshal Prezan's house, which hosted the “Muntenia” bookshop.",
      fr: "L'étude d'aménagement élaborée après le séisme de mars 1977 a entraîné la démolition des anciens immeubles à commerces au rez-de-chaussée et logements à l'étage, le plus connu étant la maison du maréchal Prezan, qui abritait la librairie « Muntenia ».",
    },
  },
  {
    date: "2026-02-02",
    url: "https://atomploiesti.ro/5362-2/",
    title: {
      ro: "Ploieștiul de altădată, un videoclip generat cu ajutorul AI",
      en: "Ploiești of old — a video created with the help of AI",
      fr: "Le Ploiești d'autrefois — une vidéo créée à l'aide de l'IA",
    },
    excerpt: {
      ro: "Un filmuleț care este o reinterpretare artistică a vechiului oraș Ploiești, realizată cu ajutorul inteligenței artificiale: o călătorie vizuală în timp, unde istoria se întâlnește cu tehnologia.",
      en: "A short film that is an artistic reinterpretation of the old city of Ploiești, made with artificial intelligence: a visual journey through time where history meets technology.",
      fr: "Un court film qui est une réinterprétation artistique de l'ancienne ville de Ploiești, réalisé grâce à l'intelligence artificielle : un voyage visuel dans le temps où l'histoire rencontre la technologie.",
    },
  },
  {
    date: "2025-12-27",
    url: "https://atomploiesti.ro/uzpr-mihail-bogdan-dabija-a-lansat-cartea-taramul-memoriei/",
    title: {
      ro: "Mihail Bogdan Dabija a lansat cartea „Tărâmul memoriei”",
      en: "Mihail Bogdan Dabija has launched the book “The Realm of Memory”",
      fr: "Mihail Bogdan Dabija a lancé le livre « Le Royaume de la mémoire »",
    },
    excerpt: {
      ro: "Lansarea volumului „Tărâmul memoriei”, un jurnal-roman cu final deschis, prefațat de scriitorul Ioan Groșescu.",
      en: "The launch of “The Realm of Memory”, a diary-novel with an open ending, prefaced by the writer Ioan Groșescu.",
      fr: "Le lancement de « Le Royaume de la mémoire », un journal-roman à fin ouverte, préfacé par l'écrivain Ioan Groșescu.",
    },
  },
];

/* ---------------- Support ---------------- */

export const SUPPORT_PARAGRAPHS: L10n[] = [
  {
    ro: "Din punct de vedere legal, conform Codului Fiscal, persoanele fizice au posibilitatea să redirecționeze 3,5% din impozitul pe veniturile obținute în anul anterior către o organizație neguvernamentală (ONG), contribuind astfel la rezolvarea unei probleme sociale din comunitate.",
    en: "Under Romanian tax law, individuals may redirect 3.5% of the tax on their previous year's income to a non-governmental organisation, thereby helping to address a social need in their community.",
    fr: "Selon le Code fiscal roumain, les particuliers peuvent rediriger 3,5 % de l'impôt sur les revenus de l'année précédente vers une organisation non gouvernementale, contribuant ainsi à résoudre un problème social de leur communauté.",
  },
  {
    ro: "Venituri din salarii: descarci și completezi Formularul 230 cu datele personale și datele asociației, apoi îl depui sau îl trimiți prin poștă, prin scrisoare recomandată cu confirmare de primire, la Administrația Financiară de care aparții.",
    en: "Income from wages: download and fill in Form 230 with your personal details and those of the association, then submit it in person or send it by registered post with acknowledgement of receipt to your local tax office.",
    fr: "Revenus salariaux : téléchargez et complétez le formulaire 230 avec vos données personnelles et celles de l'association, puis déposez-le ou envoyez-le par courrier recommandé avec accusé de réception à votre administration fiscale.",
  },
  {
    ro: "Venituri din alte surse: descarci și completezi Declarația Unică cu datele personale și datele asociației, apoi o depui sau o trimiți prin poștă la Administrația Financiară de care aparții.",
    en: "Income from other sources: download and fill in the Single Tax Return with your personal details and those of the association, then submit or post it to your local tax office.",
    fr: "Revenus d'autres sources : téléchargez et complétez la Déclaration Unique avec vos données personnelles et celles de l'association, puis déposez-la ou envoyez-la par la poste à votre administration fiscale.",
  },
  {
    ro: "Procentul de 3,5% din impozitul pe venit nu reprezintă o sponsorizare, donație sau contribuție, ci este o parte din bugetul de stat, mai exact din impozitul pe care îl plătești statului în fiecare an. Astfel, tu decizi ce se întâmplă cu acei 3,5%.",
    en: "The 3.5% of income tax is not a sponsorship, donation or contribution: it is part of the state budget — the tax you already pay each year. You simply decide where those 3.5% go.",
    fr: "Ces 3,5 % de l'impôt sur le revenu ne constituent ni un parrainage, ni un don, ni une contribution : il s'agit d'une partie du budget de l'État, l'impôt que vous payez déjà chaque année. C'est vous qui décidez de leur destination.",
  },
];
