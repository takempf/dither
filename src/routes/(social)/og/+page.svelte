<script lang="ts">
	import Message from '#lib/components/message.svelte';
</script>

<div class="og">
	<div class="top">
		<h1 class="headline">
			<em>DITHER</em> is a lo-fi GIF chat app
		</h1>
	</div>
	<div class="bottom">
		<div class="demoMessage">
			<Message
				imageUrl="/home-promo-filmstrip.png"
				text="Howdy!"
				size="normal"
				interactive={false}
			/>
		</div>
	</div>
</div>

<style>
	.og {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-around;
		width: 1200px;
		height: 630px;
		padding: 50px;
		border: var(--white) 1px dotted;
	}

	.headline {
		font-size: 75px;
		margin: 0;
	}

	.bottom {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 300px;
	}

	.demoMessage {
		transform: scale(2);
	}
</style>
