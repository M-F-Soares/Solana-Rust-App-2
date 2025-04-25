import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair, PublicKey} from '@solana/web3.js'
import {Votingdapp} from '../target/types/votingdapp'
import { BankrunProvider, startAnchor } from 'anchor-bankrun';

const IDL = require('../target/idl/votingdapp.json');

const votingAddress = new PublicKey("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

//RUSTUP_TOOLCHAIN=nightly-2025-04-01 anchor test --skip-local-validator --skip-deploy
describe('votingdapp', () => {
    let context;
    let provider;
    let votingdappProgram: any;

    beforeAll(async () => {
        context = await startAnchor("", [{name: "votingdapp", programId: votingAddress}], []);
        provider = new BankrunProvider(context);

        votingdappProgram = new Program<Votingdapp>(
            IDL,
            provider,
        )
    });

    it('Initialize Poll', async () => {
        await votingdappProgram.methods.initializePoll(
            new anchor.BN(1),
            "What is your favorite type of peanut butter?",
            new anchor.BN(1745554609),
            new anchor.BN(1808626609),
        ).rpc();

        const [pollAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
            votingAddress,
        )

        const poll = await votingdappProgram.account.poll.fetch(pollAddress) 
        console.log(poll);

        expect(poll.pollId.toNumber()).toEqual(1);
        expect(poll.descriptions).toEqual("What is your favorite type of peanut butter?");
        expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
    })

    it('Initialize Candidate', async () => {
        await votingdappProgram.methods.initializeCandidate(
            "Fluffy McCrunch",
            new anchor.BN(1),
        ).rpc();

        await votingdappProgram.methods.initializeCandidate(
            "Crunchy McFluff",
            new anchor.BN(1),
        ).rpc();

        const [crunchyAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Crunchy McFluff")],
            votingAddress,
        )
        const crunchyCandidate = await votingdappProgram.account.candidate.fetch(crunchyAddress) 
        console.log(crunchyCandidate);
        expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);

        const [fluffyAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Fluffy McCrunch")],
            votingAddress,
        )
        const fluffyCandidate = await votingdappProgram.account.candidate.fetch(fluffyAddress) 
        console.log(fluffyCandidate);
        expect(fluffyCandidate.candidateVotes.toNumber()).toEqual(0);
    })

    it('Vote', async () => {
        const [crunchyAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Crunchy McFluff")],
            votingAddress,
        )
        const crunchyCandidate = await votingdappProgram.account.candidate.fetch(crunchyAddress) 
        console.log(crunchyCandidate);

        const [fluffyAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Fluffy McCrunch")],
            votingAddress,
        )
        const fluffyCandidate = await votingdappProgram.account.candidate.fetch(fluffyAddress) 
        console.log(fluffyCandidate);

        // Both start at zero
        expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);
        expect(fluffyCandidate.candidateVotes.toNumber()).toEqual(0);

        await votingdappProgram.methods.vote(
            "Crunchy McFluff",
            new anchor.BN(1),
        ).rpc();
        const crunchyCandidateAfter = await votingdappProgram.account.candidate.fetch(crunchyAddress) 
        console.log(crunchyCandidateAfter);

        // Crunchy: 1
        // Fluffy: 0
        expect(crunchyCandidateAfter.candidateVotes.toNumber()).toEqual(1);
        expect(fluffyCandidate.candidateVotes.toNumber()).toEqual(0);

        await votingdappProgram.methods.vote(
            "Fluffy McCrunch",
            new anchor.BN(1),
        ).rpc();
        const fluffyCandidateAfter = await votingdappProgram.account.candidate.fetch(fluffyAddress) 
        console.log(fluffyCandidateAfter);

        // Crunchy: 1
        // Fluffy: 1
        expect(crunchyCandidateAfter.candidateVotes.toNumber()).toEqual(1);
        expect(fluffyCandidateAfter.candidateVotes.toNumber()).toEqual(1);
    })
})
