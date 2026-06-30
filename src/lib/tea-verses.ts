export type Verse = { text: string; ref: string };

export const VERSES: Verse[] = [
  { text: "O Senhor é o meu pastor; nada me faltará.", ref: "Salmos 23:1" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27:1" },
  { text: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", ref: "Salmos 37:5" },
  { text: "Aquietai-vos e sabei que eu sou Deus.", ref: "Salmos 46:10" },
  { text: "O amor é paciente, o amor é bondoso.", ref: "1 Coríntios 13:4" },
  { text: "Lança o teu cuidado sobre o Senhor, e ele te susterá.", ref: "Salmos 55:22" },
  { text: "Aquele que está em vós é maior do que aquele que está no mundo.", ref: "1 João 4:4" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" },
  { text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "Sede fortes e corajosos; o Senhor, vosso Deus, é convosco por onde quer que andardes.", ref: "Josué 1:9" },
  { text: "As misericórdias do Senhor são novas a cada manhã.", ref: "Lamentações 3:23" },
  { text: "Bem-aventurados os mansos, porque eles herdarão a terra.", ref: "Mateus 5:5" },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
  { text: "Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo.", ref: "Salmos 23:4" },
  { text: "Os que esperam no Senhor renovarão as suas forças.", ref: "Isaías 40:31" },
  { text: "Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.", ref: "Filipenses 4:4" },
  { text: "Em todo o tempo ama o amigo; e para a angústia nasce o irmão.", ref: "Provérbios 17:17" },
  { text: "Deus é amor.", ref: "1 João 4:8" },
  { text: "Buscai primeiro o Reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", ref: "Mateus 6:33" },
  { text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", ref: "Isaías 41:10" },
  { text: "Dai graças em tudo, porque esta é a vontade de Deus em Cristo Jesus para convosco.", ref: "1 Tessalonicenses 5:18" },
  { text: "O coração alegre é bom remédio.", ref: "Provérbios 17:22" },
  { text: "Bom é o Senhor para com aqueles que o esperam.", ref: "Lamentações 3:25" },
  { text: "Tu, porém, Senhor, és um escudo para mim, a minha glória e o que exalta a minha cabeça.", ref: "Salmos 3:3" },
  { text: "Eu sei em quem tenho crido.", ref: "2 Timóteo 1:12" },
  { text: "O Senhor pelejará por vós, e vós vos calareis.", ref: "Êxodo 14:14" },
  { text: "Onde está o Espírito do Senhor, aí há liberdade.", ref: "2 Coríntios 3:17" },
  { text: "A graça do Senhor Jesus seja com todos vós.", ref: "Apocalipse 22:21" },
  { text: "Porque para Deus nada é impossível.", ref: "Lucas 1:37" },
  { text: "O Senhor te abençoe e te guarde.", ref: "Números 6:24" },
];

export function verseOfTheDay(d: Date = new Date()): Verse {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  return VERSES[day % VERSES.length];
}