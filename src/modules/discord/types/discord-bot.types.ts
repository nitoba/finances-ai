import type { Message, OmitPartialGroupDMChannel } from 'discord.js'

export interface AudioProcessingResult {
	transcription: string
	isSuccess: boolean
	error?: string
}

export interface MessageProcessingResult {
	response: string
	isSuccess: boolean
	error?: string
}

export interface DiscordMessageContext {
	message: OmitPartialGroupDMChannel<Message>
	userId: string
	userName: string
	discordId: string
}

export interface ProcessMessageInput {
	message: OmitPartialGroupDMChannel<Message>
	content: string
}

export interface ProcessAudioInput {
	message: OmitPartialGroupDMChannel<Message>
	audioUrl: string
}

export interface IAudioProcessingService {
	processAudio(input: ProcessAudioInput): Promise<AudioProcessingResult>
	isAudioFile(filename: string): boolean
}

export interface IMessageProcessingService {
	processTextMessage(
		input: ProcessMessageInput,
		userId: string,
		userName: string,
	): Promise<MessageProcessingResult>
	sendDirectMessage(
		message: OmitPartialGroupDMChannel<Message>,
		content: string,
	): Promise<void>
}

export interface IDiscordMessageUseCase {
	handleTextMessage(input: ProcessMessageInput): Promise<void>
	handleAudioMessage(input: ProcessAudioInput): Promise<void>
}
