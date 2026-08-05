import { AppError } from "../errors/app-error.js";
import type { ChampionshipService } from "../championships/championship-service.js";
import type { MatchRepository, Match, Standing } from "../matches/match-repository.js";
import type { GroupStageRepository } from "./group-stage-repository.js";
import type { KnockoutService } from "../knockout/knockout-service.js";

export class GroupStageService {
  constructor(private readonly repository: GroupStageRepository, private readonly matches: MatchRepository, private readonly championships: ChampionshipService, private readonly knockout: KnockoutService) {}

  async generate(organizerId: string, championshipId: string) {
    const championship = await this.requireFormat(organizerId, championshipId);
    if (championship.status !== "DRAFT") throw new AppError("Os grupos só podem ser gerados antes do início.", 409, "GROUPS_REQUIRE_DRAFT");
    const [entries, existing] = await Promise.all([this.matches.listEntries(championshipId), this.matches.listByChampionship(championshipId)]);
    if (existing.length) throw new AppError("Não é possível regenerar grupos após criar partidas.", 409, "GROUP_MATCHES_ALREADY_GENERATED");
    const groups = championship.groupCount!;
    if (entries.length < groups * 2 || entries.length % groups !== 0) throw new AppError("A quantidade de participantes deve preencher grupos com pelo menos duas equipes.", 409, "INVALID_GROUP_PARTICIPANTS");
    if (championship.qualifiersPerGroup! >= entries.length / groups) throw new AppError("Cada grupo precisa ter ao menos uma equipe eliminada.", 409, "INVALID_QUALIFIERS_PER_GROUP");
    const assignments = entries.map((entry, index) => ({ entryId: entry.id, groupNumber: index % groups + 1 }));
    const generated = assignmentsByGroup(assignments).flatMap(([group, ids]) => roundRobin(ids, championship.groupLegs as 1 | 2).flatMap((round, offset) => round.map(([homeEntryId, awayEntryId]) => ({ championshipId, homeEntryId, awayEntryId, scheduledAt: null, roundNumber: offset + 1, generated: true, phase: "GROUP" as const, groupNumber: group }))));
    await this.repository.replace(championshipId, assignments);
    const created = await this.matches.createMany(generated);
    return { groups: groupView(entries, assignments), matches: created };
  }

  async overview(organizerId: string, championshipId: string) { await this.requireFormat(organizerId, championshipId); return this.getOverview(championshipId); }
  async publicOverview(championshipId: string) { return this.getOverview(championshipId); }

  async generateBracket(organizerId: string, championshipId: string) {
    const championship = await this.requireFormat(organizerId, championshipId);
    const overview = await this.getOverview(championshipId);
    if (!overview.matches.length || overview.matches.some((match) => match.status !== "FINISHED")) throw new AppError("Conclua todas as partidas da fase de grupos antes de gerar o chaveamento.", 409, "GROUP_STAGE_NOT_FINISHED");
    const qualified = overview.groups.flatMap((group) => group.standings.slice(0, championship.qualifiersPerGroup!).map((row) => ({ ...row, groupNumber: group.number })));
    if ((qualified.length & (qualified.length - 1)) !== 0) throw new AppError("O total de classificados não forma um chaveamento válido.", 409, "INVALID_QUALIFIER_BRACKET_SIZE");
    const pairings = seedPairings(overview.groups.map((group) => group.standings.slice(0, championship.qualifiersPerGroup!)));
    return this.knockout.generateFromPairings(organizerId, championshipId, pairings, championship.thirdPlace);
  }

  private async getOverview(championshipId: string) {
    const [entries, assignments, matches, championship] = await Promise.all([this.matches.listEntries(championshipId), this.repository.list(championshipId), this.matches.listByChampionship(championshipId), this.championships.getChampionshipById(championshipId)]);
    if (!championship) throw new AppError("Campeonato não encontrado.", 404, "CHAMPIONSHIP_NOT_FOUND");
    const groupMatches = matches.filter((match) => match.phase === "GROUP");
    const groups = groupView(entries, assignments).map((group) => ({ ...group, standings: standings(group.entryIds, groupMatches.filter((match) => match.groupNumber === group.number), championship) }));
    return { groups, matches: groupMatches };
  }
  private async requireFormat(organizerId: string, championshipId: string) { const championship = await this.championships.getMine(organizerId, championshipId); if (championship.format !== "GROUP_KNOCKOUT") throw new AppError("Esta competição não usa grupos e mata-mata.", 409, "CHAMPIONSHIP_IS_NOT_GROUP_KNOCKOUT"); return championship; }
}

function groupView(entries: Array<{id:string;displayName:string}>, assignments: Array<{entryId:string;groupNumber:number}>) { return [...new Set(assignments.map((a) => a.groupNumber))].sort((a,b)=>a-b).map((number) => { const entryIds=assignments.filter((a)=>a.groupNumber===number).map((a)=>a.entryId); return { number, name: `Grupo ${String.fromCharCode(64 + number)}`, entryIds, entries: entries.filter((e)=>entryIds.includes(e.id)) }; }); }
function assignmentsByGroup(assignments: Array<{entryId:string;groupNumber:number}>) { return groupView(assignments.map((a)=>({id:a.entryId,displayName:a.entryId})), assignments).map((g)=>[g.number,g.entryIds] as [number,string[]]); }
function roundRobin(ids: string[], legs: 1|2) { const items: Array<string|null>=[...ids]; if(items.length%2)items.push(null); const out:Array<Array<[string,string]>>=[]; let rotation=[...items]; for(let r=0;r<items.length-1;r++){const games:Array<[string,string]>=[]; for(let i=0;i<items.length/2;i++){const a=rotation[i],b=rotation[items.length-1-i];if(a&&b)games.push(r%2?[b,a]:[a,b]);}out.push(games);rotation=[rotation[0] ?? null,rotation[rotation.length-1] ?? null,...rotation.slice(1,-1)];} return legs===2?[...out,...out.map((round)=>round.map(([a,b])=>[b,a] as [string,string]))]:out; }
function standings(ids:string[], matches:Match[], championship: NonNullable<Awaited<ReturnType<ChampionshipService["getChampionshipById"]>>>) { const table=new Map(ids.map((id)=>[id,{entryId:id,position:0,displayName:"",played:0,wins:0,draws:0,losses:0,scoreFor:0,scoreAgainst:0,scoreDifference:0,points:0}])); for(const m of matches){if(m.status!=="FINISHED"||m.homeScore===null||m.awayScore===null)continue; const h=table.get(m.homeEntryId)!,a=table.get(m.awayEntryId)!; if(!h||!a)continue; h.displayName=m.homeEntry.displayName;a.displayName=m.awayEntry.displayName;h.played++;a.played++;h.scoreFor+=m.homeScore;h.scoreAgainst+=m.awayScore;a.scoreFor+=m.awayScore;a.scoreAgainst+=m.homeScore;if(m.homeScore>m.awayScore){h.wins++;a.losses++;h.points+=championship.winPoints;a.points+=championship.lossPoints}else if(m.homeScore<m.awayScore){a.wins++;h.losses++;a.points+=championship.winPoints;h.points+=championship.lossPoints}else{h.draws++;a.draws++;h.points+=championship.drawPoints;a.points+=championship.drawPoints}} return [...table.values()].map((x)=>({...x,scoreDifference:x.scoreFor-x.scoreAgainst})).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.scoreDifference-a.scoreDifference||b.scoreFor-a.scoreFor||a.entryId.localeCompare(b.entryId)).map((x,i)=>({...x,position:i+1})) as Standing[]; }
function seedPairings(groups: Standing[][]) { if(groups.length===2&&groups[0]!.length>=2&&groups[1]!.length>=2)return [{homeEntryId:groups[0]![0]!.entryId,awayEntryId:groups[1]![1]!.entryId},{homeEntryId:groups[1]![0]!.entryId,awayEntryId:groups[0]![1]!.entryId}]; const qualified=groups.flatMap((g)=>g.map((r)=>r.entryId)); return qualified.map((id,i)=>i%2===0?{homeEntryId:id,awayEntryId:qualified[i+1]??null}:null).filter(Boolean) as Array<{homeEntryId:string;awayEntryId:string|null}>; }
