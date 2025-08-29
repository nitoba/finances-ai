import { createTool } from '@mastra/core'
import { z } from 'zod'

export const outputSchema = z.object({
	success: z.boolean(),
	useEmbed: z.boolean(),
	embedData: z.object({
		title: z.string(),
		description: z.string(),
		color: z.string().default('#00D4AA'),
		fields: z
			.array(
				z.object({
					value: z.string(),
					name: z.string(),
					inline: z.boolean(),
				}),
			)
			.default([]),
		footer: z.string().default('Finances[AI] Bot'),
	}),
	message: z.string(),
})

export type SendDMEmbedToolResult = z.infer<typeof outputSchema>

export const sendDMEmbedTool = createTool({
	id: 'send_dm_embed',
	inputSchema: z.object({
		title: z.string().describe('Título do embed'),
		description: z.string().describe('Descrição principal do embed'),
		color: z
			.string()
			.optional()
			.describe(
				'Cor do embed em hexadecimal (ex: #00D4AA para verde, #FF6B6B para vermelho, #5865F2 para azul)',
			),
		fields: z
			.array(
				z.object({
					name: z.string().describe('Nome do campo'),
					value: z.string().describe('Valor do campo (pode usar markdown)'),
					inline: z
						.boolean()
						.optional()
						.default(false)
						.describe('Se o campo deve ser inline (lado a lado)'),
				}),
			)
			.optional()
			.describe('Campos adicionais do embed'),
		footer: z
			.string()
			.optional()
			.describe('Texto do footer (padrão: "Finances[AI] Bot")'),
	}),
	outputSchema: outputSchema,
	description: `Instrui o sistema a responder com um embed formatado elegante na DM do usuário.
	Esta ferramenta deve ser usada quando você quiser apresentar informações de forma visual e organizada.
	
	QUANDO USAR:
	- Lista de despesas do usuário
	- Relatórios financeiros (por categoria, por mês, totais)
	- Confirmação de operações (despesa adicionada, editada, removida)  
	- Resumos e estatísticas financeiras
	- Qualquer informação que ficaria melhor formatada visualmente
	
	EXEMPLOS DE USO:
	
	📋 LISTA DE DESPESAS:
	- Título: "💰 Suas Despesas de Janeiro"
	- Campos: Uma despesa por campo com emoji da categoria, descrição, valor e data
	
	📊 RELATÓRIO POR CATEGORIA:
	- Título: "📊 Relatório por Categoria"  
	- Campos: Categoria com emoji, total gasto e porcentagem
	
	✅ CONFIRMAÇÃO DE DESPESA:
	- Título: "✅ Despesa Adicionada com Sucesso"
	- Descrição: Detalhes da despesa cadastrada
	
	CORES RECOMENDADAS:
	- Verde (#00D4AA): Listas, confirmações, informações positivas
	- Azul (#5865F2): Relatórios, estatísticas, informações neutras
	- Vermelho (#FF6B6B): Alertas, gastos altos, avisos importantes
	- Amarelo (#FFD93D): Lembretes, dicas financeiras`,
	execute: async ({ context }) => {
		// Esta ferramenta não executa ações diretas no Discord
		// Ela apenas instrui o sistema de mensagens a usar embed na resposta
		return {
			success: true,
			useEmbed: true,
			embedData: {
				title: context.title,
				description: context.description,
				color: context.color || '#00D4AA',
				fields: context.fields || [],
				footer: context.footer || 'Finances AI Bot',
			},
			message: 'Embed será usado na resposta ao usuário',
		}
	},
})
