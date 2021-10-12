import type { Address, Agent, Expression, ExpressionAdapter, PublicSharing, HolochainLanguageDelegate, LanguageContext, AgentService } from "@perspect3vism/ad4m";
import { DNA_NICK } from "./dna";

class IceCandidatePutAdapter implements PublicSharing {
  #agent: AgentService;
  #iceCandidateDNA: HolochainLanguageDelegate;

  constructor(context: LanguageContext) {
    this.#agent = context.agent;
    this.#iceCandidateDNA = context.Holochain as HolochainLanguageDelegate;
  }

  async createPublic(iceCandidate: object): Promise<Address> {
    const orderedIceCandidateData = Object.keys(iceCandidate)
      .sort()
      .reduce((obj, key) => {
        obj[key] = iceCandidate[key];
        return obj;
      }, {});
    const expression = this.#agent.createSignedExpression(orderedIceCandidateData);
    const expressionPostData = {
      author: expression.author,
      timestamp: expression.timestamp,
      data: JSON.stringify(expression.data),
      proof: expression.proof,
    };
    const res = await this.#iceCandidateDNA.call(
      DNA_NICK,
      "generic_expression",
      "create_expression",
      expressionPostData
    );
    return res.toString("hex");
  }
}

export default class IceCandidateAdapter implements ExpressionAdapter {
  #iceCandidateDNA: HolochainLanguageDelegate;

  putAdapter: PublicSharing;

  constructor(context: LanguageContext) {
    this.#iceCandidateDNA = context.Holochain as HolochainLanguageDelegate;
    this.putAdapter = new IceCandidatePutAdapter(context);
  }

  async get(address: Address): Promise<Expression> {
    const hash = Buffer.from(address, "hex");
    const expression = await this.#iceCandidateDNA.call(
      DNA_NICK,
      "generic_expression",
      "get_expression_by_address",
      hash
    );
    return expression
  }

  /// Send an expression to someone privately p2p
  send_private(to: Agent, content: object) {
    //@ts-ignore
    const obj = JSON.parse(content);

    this.#iceCandidateDNA.call(DNA_NICK, "generic_expression", "send_private_expression", {
      to: to,
      data: JSON.stringify(obj),
    });
  }

  /// Get private expressions sent to you
  async inbox(filterFrom: void | Agent[]): Promise<Expression[]> {
    //TODO: add from & pages to inbox
    if (filterFrom != null) {
      filterFrom = filterFrom[0];
    }
    const res = await this.#iceCandidateDNA.call(
      DNA_NICK,
      "generic_expression",
      "inbox",
      { from: filterFrom, page_size: 0, page_number: 0 }
    );
    const out = [];
    res.forEach((expression) => {
      out.push({
        author: expression.creator,
        timestamp: expression.created_at,
        data: JSON.parse(expression),
        proof: undefined,
      });
    });
    return out;
  }
}
