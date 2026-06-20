import { describe, it } from 'vitest';
import { getSafeMessageKnowledgeSnippets, knowledgeRegistry, buildAssistantKnowledgeAnswerContext } from '@/modules/knowledge';
describe('debug', ()=>{
  it('inspect', ()=>{
    const out = getSafeMessageKnowledgeSnippets('customer','rfq','ar',3);
    console.log('out=', out.map(r => r.item.id));
    console.log('candidates=', knowledgeRegistry.filter(it => it.usableInMessages && it.tags.includes('rfq') && it.audience.includes('customer')).map(i=>i.id));
    const ctx = buildAssistantKnowledgeAnswerContext('وصفة كعكة الشوكولاتة بالحليب المكثف','visitor','ar');
    console.log('ctx items=', ctx.matchedItems.map(r => ({id:r.item.id, score:r.score})));
  });
});
