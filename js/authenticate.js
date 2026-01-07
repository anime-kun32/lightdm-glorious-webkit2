class Authenticate {
	constructor() {
		this._passwordBox = document.querySelector('#input-password-box');
		this._passwordInput = document.querySelector('#input-password');
		this._buttonAuthenticate = document.querySelector('#button-authenticate');
		this._passwordInputContainer = document.querySelector('#input-password-container');
		this._tooltipPassword = document.querySelector('#tooltip-password');
		this._password = '';
		this._init();
	}

	_returnRandomErrorMessages() {
		const errorMessages = [
				'ACCESS DENIED.',
				'Try again BUDDY!',
				'THIS INCIDENT WILL BE REPORTED.',
				'Just put the correct one!',
				'This will self-destruct in 60 seconds!',
				'Uhhh... are you sure you know what you are doing?',
				'“You miss 100% of the shots you don\'t take – Wayne Gretzky – Michael Scott”',
				'You are not Pranav!',
				'I can do this all day.',
				'This ain\'t it chief! Try again.'
		];
		return errorMessages[Math.floor(Math.random() * errorMessages.length)];
	}

	_returnRandomSuccessfulMessages() {
		const errorMessages = [
				'So what\'s your plan today?',
				'I see you are smiling there!',
				'Use me for work!',
				'Just Backup your data.',
				'I\'m better than you think!',
				'I ain\'t got much time here. Make every second count.',
				'You are someone\'s reason to smile.',
				'Stop! Don\'t Stop.',
				'Make someone Happy today :)'
		];
		return errorMessages[Math.floor(Math.random() * errorMessages.length)];
	}

	// Start authentication - prefer window.currentUsername if provided
	startAuthentication() {
		try {
			if (typeof lightdm === 'undefined') {
				console.warn('Authenticate.startAuthentication: lightdm is undefined');
				return;
			}

			lightdm.cancel_authentication();

			const userFromWindow = (typeof window.currentUsername !== 'undefined' && window.currentUsername) ? String(window.currentUsername) : null;
			const user = userFromWindow || String(accounts.getDefaultUserName());
			console.log(`Authenticate: starting authentication for user '${user}'`);
			lightdm.authenticate(user);
		} catch (err) {
			console.error('Authenticate.startAuthentication error:', err);
		}
	}

	// Timer expired, create new authentication session
	_autologinTimerExpired() {
		window.autologin_timer_expired = () => {
			this.startAuthentication();
		};
	}

	// Authentication completed callback
	_authenticationComplete() {
		// Use a global callback for LightDM
		window.authentication_complete = () => {
			if (lightdm.is_authenticated) {
				this._authenticationSuccess();
			} else {
				this._authenticationFailed();
			}
		};
	}

	// You passed to authentication
	_authenticationSuccess() {
		this._password = null;

		// Make password input read-only
		if (this._passwordInput) {
			this._passwordInput.readOnly = true;
			this._passwordInput.blur();
		}
		
		// Success messages
		this._passwordBox.classList.add('authentication-success');
		this._tooltipPassword.innerText = this._returnRandomSuccessfulMessages();
		this._tooltipPassword.classList.add('tooltip-success');

		setTimeout(
			() => {
				loginFade.showLoginFade();
			},
			500
		);

		// Add a delay before unlocking and starting session
		setTimeout(
			() => {
				this._buttonAuthenticate.classList.remove('authentication-success');

				// Prefer window.currentSession if set; fallback to sessions.getDefaultSession()
				const sessionFromWindow = (typeof window.currentSession !== 'undefined' && window.currentSession) ? String(window.currentSession) : null;
				const sessionToStart = sessionFromWindow || String(sessions.getDefaultSession());

				console.log(`Authenticate: starting session '${sessionToStart}'`);
				// Prefer async start_session; fall back to start_session_sync
				if (typeof lightdm.start_session === 'function') {
					lightdm.start_session(sessionToStart);
				} else if (typeof lightdm.start_session_sync === 'function') {
					lightdm.start_session_sync(sessionToStart);
				} else {
					console.error('Authenticate: no start_session function available on lightdm object');
				}

				this._tooltipPassword.classList.remove('tooltip-success');
			},
			1000
		);
	}

	// Remove authentication failure messages
	_authFailedRemove() {
		this._tooltipPassword.classList.remove('tooltip-error');
		this._passwordBox.classList.remove('authentication-failed');
	}

	// You failed to authenticate
	_authenticationFailed() {
		this._password = null;

		// Clear password input
		if (this._passwordInput) this._passwordInput.value = '';

		// Error messages/UI
		this._passwordBox.classList.add('authentication-failed');
		this._tooltipPassword.innerText = this._returnRandomErrorMessages();
		this._tooltipPassword.classList.add('tooltip-error');

		// Shake animation
		this._passwordInputContainer.classList.add('shake');
		setTimeout(
			() => {
				this._passwordInputContainer.classList.remove('shake');
			},
			500
		);

		// Restart authentication after short delay
		setTimeout(() => {
			this.startAuthentication();
		}, 800);
	}

	// Register click event for authenticate button
	_buttonAuthenticateClickEvent() {
		if (!this._buttonAuthenticate) return;
		this._buttonAuthenticate.addEventListener(
			'click',
			() => {
				console.log('Authenticate: button clicked, in_authentication=', lightdm && lightdm.in_authentication);
				this._authFailedRemove();
				this._password = this._passwordInput ? this._passwordInput.value : '';
				// Compatibility: check global usr_password field used by other script
				if ((!this._password || this._password.length === 0) && document.getElementById('usr_password')) {
					this._password = document.getElementById('usr_password').value;
				}
				lightdm.respond(String(this._password));
			}
		);
	}

	// Register keydown event (Enter key) for password inputs
	_passwordInputKeyDownEvent() {
		const pwdInputs = [];
		if (this._passwordInput) pwdInputs.push(this._passwordInput);
		const altPwd = document.getElementById('usr_password');
		if (altPwd && altPwd !== this._passwordInput) pwdInputs.push(altPwd);

		pwdInputs.forEach(inputEl => {
			inputEl.addEventListener(
				'keydown',
				e => {
					this._authFailedRemove();
					this._password = inputEl.value;
					if (e.key === 'Enter') {
						lightdm.respond(String(this._password));
					}
				}
			);
		});
	}

	_init() {
		this._autologinTimerExpired();
		this._authenticationComplete();
		this._buttonAuthenticateClickEvent();
		this._passwordInputKeyDownEvent();

		if (typeof lightdm === 'undefined') {
			console.warn('Authenticate: lightdm object is undefined at init');
		}

		if (typeof lightdm !== 'undefined' && typeof lightdm.onload === 'function') {
			lightdm.onload = () => {
				console.log('Start authentication (onload)');
				this.startAuthentication();
			};
		} else if (typeof lightdm !== 'undefined') {
			console.log('Start authentication');
			this.startAuthentication();
		}
	}
}
